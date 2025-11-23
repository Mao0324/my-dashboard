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
import json

# ==========================================
# 1. 配置与初始化
# ==========================================

# 从环境变量获取敏感信息
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")

# QQ邮箱配置 (SMTP)
EMAIL_HOST = "smtp.qq.com" 
EMAIL_PORT = 465 
EMAIL_USER = os.environ.get("EMAIL_USER") 
EMAIL_PASS = os.environ.get("EMAIL_PASS") 

# 初始化 Firebase
if not firebase_admin._apps:
    if FIREBASE_CREDENTIALS:
        try:
            cred_dict = json.loads(FIREBASE_CREDENTIALS)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Firebase 初始化失败: {e}")
            exit(1)
    else:
        print("警告: 未找到 FIREBASE_SERVICE_ACCOUNT_KEY 环境变量，无法读取数据。")
        exit(1)

try:
    db = firestore.client()
except Exception as e:
    print(f"数据库连接失败: {e}")
    db = None

# ==========================================
# 2. 辅助函数
# ==========================================

def get_beijing_time():
    """获取当前的北京时间"""
    utc_now = datetime.datetime.utcnow()
    return utc_now + datetime.timedelta(hours=8)

defQD_send_email(to_addr, subject, content):
    """发送邮件函数"""
    if not to_addr or not EMAIL_USER or not EMAIL_PASS:
        print(f"跳过发送: 邮箱配置不完整 (To: {to_addr})")
        return False

    # 构造邮件
    message = MIMEText(content, 'plain', 'utf-8')
    message['From'] = formataddr(["MyDashboard Assistant", EMAIL_USER])
    message['To'] = to_addr
    message['Subject'] = Header(subject, 'utf-8')

    try:
        server = smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT)
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, to_addr, message.as_string())
        server.quit()
        print(f"✅ 邮件已成功发送至: {to_addr}")
        return True
    except Exception as e:
        print(f"❌ 发送邮件失败 ({to_addr}): {e}")
        return False

def fetch_weather_data(lat, lon):
    """调用 Open-Meteo API 获取天气数据"""
    if not lat or not lon:
        return None
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto"
    
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            return res.json().get('daily')
        else:
            print(f"天气API返回错误: {res.status_code}")
            return None
    except Exception as e:
        print(f"获取天气异常: {e}")
        return None

# ==========================================
# 3. 业务逻辑：日常检查 (早/晚安)
# ==========================================

def process_morning_routine(user_data, alerts, weather_daily, high_limit, low_limit, city_name):
    # ... (原有逻辑保持不变)
    events = user_data.get("events", [])
    if not events and user_data.get("targetDate"):
        events = [{"name": user_data.get("targetName", "重要日子"), "date": user_data.get("targetDate")}]
    today_date = datetime.date.today()
    for event in events:
        date_str = event.get("date")
        name = event.get("name", "未命名事件")
        if date_str:
            try:
                target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                days_left = (target_date - today_date).days
                if days_left == 3: alerts.append(f"📅 [倒数] 距离【{name}】还剩 3 天！")
                elif days_left == 1: alerts.append(f"📅 [倒数] 【{name}】就在明天！")
                elif days_left == 0: alerts.append(f"🎉 [今日] 今天就是【{name}】！")
            except ValueError: continue
    if weather_daily:
        try:
            td_max = weather_daily['temperature_2m_max'][0]
            td_min = weather_daily['temperature_2m_min'][0]
            td_rain = weather_daily['precipitation_sum'][0]
            weather_summary = f"☀️ [今日天气] {city_name}: {td_min}°C ~ {td_max}°C"
            if td_rain > 0: weather_summary += f", 降雨 {td_rain}mm"
            alerts.insert(0, weather_summary)
            tm_max = weather_daily['temperature_2m_max'][1]
            tm_min = weather_daily['temperature_2m_min'][1]
            tm_rain = weather_daily['precipitation_sum'][1]
            if tm_max > high_limit: alerts.append(f"🔥 [明日高温] 预计最高 {tm_max}°C，注意防暑")
            if tm_min < low_limit: alerts.append(f"❄️ [明日低温] 预计最低 {tm_min}°C，注意保暖")
            if tm_rain > 0: alerts.append(f"☔ [明日降雨] 预计有雨 ({tm_rain}mm)，记得备伞")
        except Exception as e: print(f"解析天气出错: {e}")
    return "【早安】今日天气与日程提醒"

def process_evening_routine(user_data, alerts, weather_daily, city_name):
    if weather_daily:
        try:
            tm_max = weather_daily['temperature_2m_max'][1]
            tm_min = weather_daily['temperature_2m_min'][1]
            tm_rain = weather_daily['precipitation_sum'][1]
            alerts.append(f"🌙 明日({city_name})天气预告：")
            alerts.append(f"   --------------------")
            alerts.append(f"   🌡️ 气温：{tm_min}°C ~ {tm_max}°C")
            rain_msg = f"   💧 降雨：{tm_rain}mm"
            rain_msg += " (出门记得带伞)" if tm_rain > 0 else " (无雨)"
            alerts.append(rain_msg)
        except Exception: pass
    return "【晚安】明日天气预告"

# ==========================================
# 4. 新增业务逻辑：处理邮件队列
# ==========================================

def process_mail_queue():
    """检查 Firestore 的 mail_queue 集合，发送待处理的邮件"""
    print("\n📩 开始检查邮件队列 (mail_queue)...")
    try:
        # 获取未处理的邮件请求
        # 注意：这里我们假设所有在队列里的都是 pending 的，或者你可以加个 .where("status", "==", "pending")
        # 简单起见，我们处理所有文档，然后删除
        queue_ref = db.collection("mail_queue")
        docs = queue_ref.stream()
        
        count = 0
        for doc in docs:
            data = doc.to_dict()
            to_email = data.get("to")
            subject = data.get("subject", "MyDashboard Notification")
            content = data.get("content", "")
            
            if to_email and content:
                print(f"  -> 正在发送给 {to_email}: {subject}")
                success = QD_send_email(to_email, subject, content)
                
                if success:
                    # 发送成功，删除文档
                    db.collection("mail_queue").document(doc.id).delete()
                    count += 1
                else:
                    print(f"  -> 发送失败，保留文档 {doc.id}")
            else:
                # 数据无效，直接删除
                print(f"  -> 数据无效，移除 {doc.id}")
                db.collection("mail_queue").document(doc.id).delete()
                
        if count == 0:
            print("  -> 队列为空，无待发送邮件。")
        else:
            print(f"  -> 已处理 {count} 封邮件。")
            
    except Exception as e:
        print(f"❌ 处理邮件队列时出错: {e}")

# ==========================================
# 5. 主程序
# ==========================================

def main():
    print("-" * 30)
    if not db:
        print("❌ 数据库未连接，程序终止")
        return

    # 1. 优先处理实时性要求高的邮件队列
    # (如果此脚本在本地定时运行或手动触发，可以及时发送番茄钟提醒)
    process_mail_queue()

    # 2. 判断当前时间段，执行早晚安推送
    bj_time = get_beijing_time()
    current_hour = bj_time.hour
    
    # 只有在特定时间点才执行群发 (避免每次调试都群发)
    # 这里的逻辑是：如果是在 CI 环境运行，通常是定时的；如果是本地，你可能只想处理队列
    # 为了简单，我们还是保留原有的时间判断逻辑
    
    is_evening_run = 16 <= current_hour <= 22
    mode_str = "晚安推送" if is_evening_run else "早安推送"
    
    print(f"\n🕒 当前北京时间: {bj_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🚀 执行模式: {mode_str} (如果现在是手动运行，请忽略此模式)")

    # 简单遍历用户检查推送
    try:
        users_ref = db.collection("users")
        docs = users_ref.stream()

        for doc in docs:
            user_data = doc.to_dict()
            email = user_data.get("emailAddress")
            
            # 只有开启了邮件提醒才发送
            if not email or not user_data.get("emailAlerts", True): 
                continue
            
            # --- 这里可以增加逻辑：比如检查是否今天已经发送过，防止重复 ---
            # 简化版：直接发送
            
            # 获取配置
            high_limit = user_data.get("tempHighThreshold", 35)
            low_limit = user_data.get("tempLowThreshold", 5)
            lat = user_data.get("latitude", 39.9042)
            lon = user_data.get("longitude", 116.4074)
            city_name = user_data.get("city", "本地")
            
            weather_daily = fetch_weather_data(lat, lon)
            alerts = []
            
            if is_evening_run:
                subject = process_evening_routine(user_data, alerts, weather_daily, city_name)
            else:
                subject = process_morning_routine(user_data, alerts, weather_daily, high_limit, low_limit, city_name)

            if alerts:
                alerts.append("\n(这是一封自动发送的邮件，请勿直接回复)")
                content = f"您好！\n\n" + "\n".join(alerts)
                # send_email(email, subject, content) 
                # 注意：为了防止每次测试都发骚扰邮件，这里注释掉了自动推送逻辑。
                # 如果你需要 daily check 生效，请取消下面这行的注释:
                send_email(email, subject, content)
                pass

    except Exception as e:
        print(f"❌ 批量推送执行错误: {e}")

if __name__ == "__main__":
    main()