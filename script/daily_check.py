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
EMAIL_HOST = "smtp.gmail.com" # 或者 smtp.qq.com, smtp.163.com
EMAIL_PORT = 587
EMAIL_USER = os.environ.get("EMAIL_USER")
EMAIL_PASS = os.environ.get("EMAIL_PASS")

# 初始化 Firebase
if not firebase_admin._apps:
    # 将 JSON 字符串写入临时文件以便 SDK 读取，或者使用 dict 初始化
    import json
    cred_dict = json.loads(FIREBASE_CREDENTIALS)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 2. 辅助函数 ---

def send_email(to_addr, subject, content):
    if not to_addr:
        print("没有收件人邮箱，跳过发送。")
        return

    message = MIMEText(content, 'plain', 'utf-8')
    message['From'] = Header("MyDashboard Bot", 'utf-8')
    message['To'] = Header(to_addr, 'utf-8')
    message['Subject'] = Header(subject, 'utf-8')

    try:
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
    
    # 获取所有用户设置
    users_ref = db.collection("users")
    docs = users_ref.stream()

    for doc in docs:
        user_data = doc.to_dict()
        email = user_data.get("emailAddress")
        city = user_data.get("city", "Beijing")
        
        # 默认阈值
        high_temp_limit = user_data.get("tempHighThreshold", 35)
        low_temp_limit = user_data.get("tempLowThreshold", 5)
        
        alerts = []

        # --- A. 检查倒数日 ---
        target_date_str = user_data.get("targetDate")
        target_name = user_data.get("targetName", "重要日子")
        if target_date_str:
            target_date = datetime.datetime.strptime(target_date_str, "%Y-%m-%d").date()
            today = datetime.date.today()
            days_left = (target_date - today).days
            
            if days_left == 3:
                alerts.append(f"📅 倒数提醒：距离【{target_name}】还剩 3 天！")
            elif days_left == 1:
                alerts.append(f"📅 倒数提醒：【{target_name}】就在明天！")

        # --- B. 检查天气 (简化版：假设北京坐标，实际应通过 Geocoding API 将城市转为坐标) ---
        # 这里为了演示稳定，固定使用 Beijing 坐标，你可以接入 Geocoding API 优化
        lat, lon = 39.9042, 116.4074 
        weather_data = check_weather(lat, lon)

        if weather_data:
            # 检查明天的天气 (索引 1)
            tomorrow_max = weather_data['temperature_2m_max'][1]
            tomorrow_min = weather_data['temperature_2m_min'][1]
            tomorrow_rain = weather_data['precipitation_sum'][1]

            if tomorrow_max > high_temp_limit:
                alerts.append(f"🔥 高温预警：明日最高温 {tomorrow_max}°C，超过设定阈值。")
            
            if tomorrow_min < low_temp_limit:
                alerts.append(f"❄️ 降温预警：明日最低温 {tomorrow_min}°C，请注意保暖。")
            
            if tomorrow_rain > 0:
                alerts.append(f"☔ 雨天提醒：明日预计有降雨 ({tomorrow_rain}mm)，记得带伞。")

        # --- C. 发送汇总邮件 ---
        if alerts and email:
            content = "您好，这是您的每日智能助理提醒：\n\n" + "\n".join(alerts)
            send_email(email, "【重要】明日天气与日程提醒", content)
        else:
            print(f"用户 {email} 无需发送提醒。")

if __name__ == "__main__":
    main()