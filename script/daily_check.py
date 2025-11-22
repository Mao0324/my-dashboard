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

# QQ邮箱配置
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

def send_email(to_addr, subject, content):
    """发送邮件函数"""
    if not to_addr or not EMAIL_USER or not EMAIL_PASS:
        print(f"跳过发送: 邮箱配置不完整 (To: {to_addr})")
        return

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
    except Exception as e:
        print(f"❌ 发送邮件失败 ({to_addr}): {e}")

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
# 3. 核心逻辑
# ==========================================

def process_morning_routine(user_data, alerts, weather_daily, high_limit, low_limit, city_name):
    """处理早安推送逻辑：今日天气 + 倒数日 + 明日预警"""
    
    # --- 1. 倒数日检查 ---
    events = user_data.get("events", [])
    # 兼容旧数据格式
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
                
                if days_left == 3:
                    alerts.append(f"📅 [倒数] 距离【{name}】还剩 3 天！")
                elif days_left == 1:
                    alerts.append(f"📅 [倒数] 【{name}】就在明天！")
                elif days_left == 0:
                    alerts.append(f"🎉 [今日] 今天就是【{name}】！")
            except ValueError:
                continue

    # --- 2. 天气检查 ---
    if weather_daily:
        try:
            # 今日天气 (Index 0)
            td_max = weather_daily['temperature_2m_max'][0]
            td_min = weather_daily['temperature_2m_min'][0]
            td_rain = weather_daily['precipitation_sum'][0]
            
            weather_summary = f"☀️ [今日天气] {city_name}: {td_min}°C ~ {td_max}°C"
            ifTD_rain_msg = f", 降雨 {td_rain}mm" if td_rain > 0 else ""
            alerts.insert(0, weather_summary + ifTD_rain_msg)

            # 明日预警 (Index 1)
            tm_max = weather_daily['temperature_2m_max'][1]
            tm_min = weather_daily['temperature_2m_min'][1]
            tm_rain = weather_daily['precipitation_sum'][1]

            if tm_max > high_limit:
                alerts.append(f"wm [明日高温] 预计最高 {tm_max}°C，注意防暑")
            ifTM_min = tm_min # Typo fix variable assignment logic
            if tm_min < low_limit:
                alerts.append(f"❄️ [明日低温] 预计最低 {tm_min}°C，注意保暖")
            if tm_rain > 0:
                alerts.append(f"☔ [明日降雨] 预计有雨 ({tm_rain}mm)，记得备伞")
                
        except (IndexError, KeyError, TypeError) as e:
            print(f"解析早安天气数据出错: {e}")

    return "【早安】今日天气与日程提醒"

def process_evening_routine(user_data, alerts, weather_daily, city_name):
    """处理晚安推送逻辑：仅明日天气预报"""
    
    if weather_daily:
        try:
            # 明日天气 (Index 1)
            tm_max = weather_daily['temperature_2m_max'][1]
            tm_min = weather_daily['temperature_2m_min'][1]
            tm_rain = weather_daily['precipitation_sum'][1]
            
            alerts.append(f"🌙 明日({city_name})天气预告：")
            alerts.append(f"   --------------------")
            alerts.append(f"   🌡️ 气温：{tm_min}°C ~ {tm_max}°C")
            
            rain_msg = f"   💧 降雨：{tm_rain}mm"
            if tm_rain > 0:
                rain_msg += " (出门记得带伞)"
            else:
                rain_msg += " (无雨)"
            alerts.append(rain_msg)
            
        except (IndexError, KeyError, TypeError) as e:
            print(f"解析晚安天气数据出错: {e}")

    return "【晚安】明日天气预告"

# ==========================================
# 4. 主程序
# ==========================================

def main():
    print("-" * 30)
    if not db:
        print("❌ 数据库未连接，程序终止")
        return

    # 1. 判断当前时间段
    bj_time = get_beijing_time()
    current_hour = bj_time.hour
    
    # 定义时间窗口：16:00 - 22:00 为晚班，其他时间为早班
    # 对应 GitHub Actions 触发时间：
    # 早班触发：北京时间 07:00 (run at 07)
    # 晚班触发：北京时间 18:00 (run at 18)
    is_evening_run = 16 <= current_hour <= 22
    mode_str = "晚安推送 (明日预告)" if is_evening_run else "早安推送 (今日+倒数日)"
    
    print(f"🕒 当前北京时间: {bj_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🚀 执行模式: {mode_str}")
    print("-" * 30)

    try:
        # 2. 获取所有用户
        users_ref = db.collection("users")
        docs = users_ref.stream()

        for doc in docs:
            user_data = doc.to_dict()
            email = user_data.get("emailAddress")
            
            if not email:
                print(f"用户 {doc.id} 未设置邮箱，跳过")
                continue
            
            print(f"正在处理用户: {email} ...")

            # 3. 获取基础配置
            high_limit = user_data.get("tempHighThreshold", 35)
            low_limit = user_data.get("tempLowThreshold", 5)
            lat = user_data.get("latitude")
            lon = user_data.get("longitude")
            city_name = user_data.get("city", "本地")
            
            # 默认坐标(北京)
            if not lat or not lon:
                lat, lon = 39.9042, 116.4074

            # 4. 获取公共天气数据
            weather_daily = fetch_weather_data(lat, lon)
            
            alerts = []
            subject = ""

            # 5. 根据模式分发逻辑
            if is_evening_run:
                subject = process_evening_routine(user_data, alerts, weather_daily, city_name)
            else:
                subject = process_morning_routine(user_data, alerts, weather_daily, high_limit, low_limit, city_name)

            # 6. 发送邮件
            if alerts:
                # 添加页脚
                alerts.append("\n(这是一封自动发送的邮件，请勿直接回复)")
                content = f"您好！\n\n" + "\n".join(alerts)
                send_email(email, subject, content)
            else:
                print(f"  -> 无需发送提醒 (无触发规则)")

    except Exception as e:
        print(f"❌ 脚本执行过程中发生全局错误: {e}")

if __name__ == "__main__":
    main()