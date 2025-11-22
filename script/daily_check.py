import os
import datetime
import smtplib
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
import requests
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# --- 1. 配置初始化 ---

# 从环境变量获取敏感信息 (在 GitHub Secrets 中设置)
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")

# --- QQ邮箱配置 ---
EMAIL_HOST = "smtp.qq.com" 
EMAIL_PORT = 465 # QQ邮箱使用 SSL 端口
EMAIL_USER = os.environ.get("EMAIL_USER") # 你的QQ邮箱
EMAIL_PASS = os.environ.get("EMAIL_PASS") # 你的QQ邮箱授权码

# 初始化 Firebase
if not firebase_admin._apps:
    if FIREBASE_CREDENTIALS:
        try:
            import json
            cred_dict = json.loads(FIREBASE_CREDENTIALS)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Firebase 初始化失败: {e}")
    else:
        print("警告: 未找到 FIREBASE_SERVICE_ACCOUNT_KEY 环境变量")

# 获取数据库客户端
try:
    db = firestore.client()
except:
    db = None

# --- 2. 辅助函数 ---

def send_email(to_addr, subject, content):
    if not to_addr:
        print("没有收件人邮箱，跳过发送。")
        return

    if not EMAIL_USER or not EMAIL_PASS:
        print("没有配置发件人邮箱或授权码，跳过发送。")
        return

    message = MIMEText(content, 'plain', 'utf-8')
    message['From'] = formataddr(["MyDashboard Bot", EMAIL_USER])
    message['To'] = to_addr
    message['Subject'] = Header(subject, 'utf-8')

    try:
        server = smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT)
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, to_addr, message.as_string())
        server.quit()
        print(f"邮件已发送至: {to_addr}")
    except Exception as e:
        print(f"发送邮件失败: {e}")

def check_weather(lat, lon):
    if not lat or not lon:
        return None
    # 使用 Open-Meteo API
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
    try:
        res = requests.get(url).json()
        return res['daily']
    except:
        return None

# --- 3. 主逻辑 ---

def main():
    print("开始执行每日检查任务...")
    
    if not db:
        print("无法连接数据库，任务终止。")
        return

    try:
        users_ref = db.collection("users")
        docs = users_ref.stream()

        for doc in docs:
            user_data = doc.to_dict()
            email = user_data.get("emailAddress")
            
            if not email:
                continue

            high_temp_limit = user_data.get("tempHighThreshold", 35)
            low_temp_limit = user_data.get("tempLowThreshold", 5)
            
            alerts = []

            # --- A. 检查倒数日 (支持多事件) ---
            events = user_data.get("events", [])
            
            # 兼容旧格式: 如果没有events数组但有targetDate
            if not events and user_data.get("targetDate"):
                events = [{
                    "name": user_data.get("targetName", "重要日子"),
                    "date": user_data.get("targetDate")
                }]

            today = datetime.date.today()

            for event in events:
                date_str = event.get("date")
                name = event.get("name", "未命名事件")
                
                if date_str:
                    try:
                        target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                        days_left = (target_date - today).days
                        
                        # 提醒逻辑
                        if days_left == 3:
                            alerts.append(f"📅 倒数提醒：距离【{name}】还剩 3 天！")
                        elif days_left == 1:
                            alerts.append(f"📅 倒数提醒：【{name}】就在明天！")
                        elif days_left == 0:
                            alerts.append(f"📅 就在今天！【{name}】")
                    except ValueError:
                        continue

            # --- B. 检查天气 (动态坐标) ---
            lat = user_data.get("latitude")
            lon = user_data.get("longitude")
            city_name = user_data.get("city", "Unknown City")
            
            # 如果用户还没保存过新版设置，默认使用北京坐标
            if not lat or not lon:
                 lat, lon = 39.9042, 116.4074

            weather_data = check_weather(lat, lon)

            if weather_data:
                try:
                    # 检查明天的天气
                    tomorrow_max = weather_data['temperature_2m_max'][1]
                    tomorrow_min = weather_data['temperature_2m_min'][1]
                    tomorrow_rain = weather_data['precipitation_sum'][1]

                    if tomorrow_max > high_temp_limit:
                        alerts.append(f"🔥 高温预警 ({city_name})：明日最高温 {tomorrow_max}°C，超过设定阈值。")
                    
                    if tomorrow_min < low_temp_limit:
                        alerts.append(f"❄️ 降温预警 ({city_name})：明日最低温 {tomorrow_min}°C，请注意保暖。")
                    
                    if tomorrow_rain > 0:
                        alerts.append(f"☔ 雨天提醒 ({city_name})：明日预计有降雨 ({tomorrow_rain}mm)，记得带伞。")
                except (IndexError, KeyError, TypeError):
                    pass

            # --- C. 发送邮件 ---
            if alerts:
                content = "您好，这是您的每日智能助理提醒：\n\n" + "\n".join(alerts)
                send_email(email, "【重要】明日天气与日程提醒", content)
            else:
                print(f"用户 {email} 无需发送提醒。")
                
    except Exception as e:
        print(f"执行出错: {e}")

if __name__ == "__main__":
    main()