import os
import datetime
import smtplib
from email.mime.text import MIMEText
from email.header import Header
import requests
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# --- 1. 配置初始化 ---

# 从环境变量获取敏感信息 (在 GitHub Secrets 中设置)
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY") # JSON 字符串

# --- 修改：QQ邮箱配置 ---
EMAIL_HOST = "smtp.qq.com" 
EMAIL_PORT = 465 # QQ邮箱通常使用 SSL 端口 465
EMAIL_USER = os.environ.get("EMAIL_USER") # 你的QQ邮箱 (例如 123456@qq.com)
EMAIL_PASS = os.environ.get("EMAIL_PASS") # 注意：这里填QQ邮箱的“授权码”！

# 初始化 Firebase
if not firebase_admin._apps:
    if FIREBASE_CREDENTIALS:
        import json
        cred_dict = json.loads(FIREBASE_CREDENTIALS)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    else:
        print("警告: 未找到 FIREBASE_SERVICE_ACCOUNT_KEY 环境变量")

db = firestore.client()

# --- 2. 辅助函数 ---

def send_email(to_addr, subject, content):
    if not to_addr:
        print("没有收件人邮箱，跳过发送。")
        return

    message = MIMEText(content, 'plain', 'utf-8')
    message['From'] = Header(f"MyDashboard <{EMAIL_USER}>", 'utf-8')
    message['To'] = Header(to_addr, 'utf-8')
    message['Subject'] = Header(subject, 'utf-8')

    try:
        # --- 修改：根据端口判断连接方式 ---
        if EMAIL_PORT == 465:
            # QQ邮箱推荐使用 SSL
            server = smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT)
        else:
            # 其他邮箱可能使用 TLS
            server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
            server.starttls()
            
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, to_addr, message.as_string())
        server.quit()
        print(f"邮件已发送至: {to_addr}")
    except Exception as e:
        print(f"发送邮件失败: {e}")

def check_weather(lat, lon):
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
    
    try:
        # 获取所有用户设置
        users_ref = db.collection("users")
        docs = users_ref.stream()

        for doc in docs:
            user_data = doc.to_dict()
            email = user_data.get("emailAddress")
            
            # 默认阈值
            high_temp_limit = user_data.get("tempHighThreshold", 35)
            low_temp_limit = user_data.get("tempLowThreshold", 5)
            
            alerts = []

            # --- A. 检查倒数日 ---
            target_date_str = user_data.get("targetDate")
            target_name = user_data.get("targetName", "重要日子")
            if target_date_str:
                try:
                    target_date = datetime.datetime.strptime(target_date_str, "%Y-%m-%d").date()
                    today = datetime.date.today()
                    days_left = (target_date - today).days
                    
                    if days_left == 3:
                        alerts.append(f"📅 倒数提醒：距离【{target_name}】还剩 3 天！")
                    elif days_left == 1:
                        alerts.append(f"📅 倒数提醒：【{target_name}】就在明天！")
                except ValueError:
                    pass

            # --- B. 检查天气 ---
            # 这里固定使用 Beijing 坐标演示
            lat, lon = 39.9042, 116.4074 
            weather_data = check_weather(lat, lon)

            if weather_data:
                # 检查明天的天气 (索引 1)
                try:
                    tomorrow_max = weather_data['temperature_2m_max'][1]
                    tomorrow_min = weather_data['temperature_2m_min'][1]
                    tomorrow_rain = weather_data['precipitation_sum'][1]

                    if tomorrow_max > high_temp_limit:
                        alerts.append(f"🔥 高温预警：明日最高温 {tomorrow_max}°C，超过设定阈值。")
                    
                    if tomorrow_min < low_temp_limit:
                        alerts.append(f"❄️ 降温预警：明日最低温 {tomorrow_min}°C，请注意保暖。")
                    
                    if tomorrow_rain > 0:
                        alerts.append(f"☔ 雨天提醒：明日预计有降雨 ({tomorrow_rain}mm)，记得带伞。")
                except IndexError:
                    pass

            # --- C. 发送汇总邮件 ---
            if alerts and email:
                content = "您好，这是您的每日智能助理提醒：\n\n" + "\n".join(alerts)
                send_email(email, "【重要】明日天气与日程提醒", content)
            else:
                print(f"用户 {email} 无需发送提醒。")
                
    except Exception as e:
        print(f"执行出错: {e}")

if __name__ == "__main__":
    main()