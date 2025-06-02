from flask import Flask, jsonify, request, session
from pymongo import MongoClient, server_api
from pymongo.errors import ConnectionFailure, PyMongoError
from flask_cors import CORS, cross_origin
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, create_refresh_token, get_jwt_identity
from bson.json_util import dumps
from bson import ObjectId
import json
import datetime
import httpx
import random
import re
from email_validator import validate_email, EmailNotValidError
import bcrypt
import hashlib
app = Flask(__name__, static_url_path='/static')
CORS(
 app,
 resources={
  r"/*": {
   "origins": "*",
   "methods": [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
   ],
   "allow_headers": [
    "Content-Type",
    "Authorization",
   ],
  }
 },
)
app.config['JWT_SECRET_KEY'] = ""
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours = 3)  # Access Token 過期時間
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days = 14)  # Refresh Token 過期時間
jwt = JWTManager()
jwt.init_app(app)

MongoDBUri = ""
MALE_WEBHOOK_URL = ""
FEMALE_WEBHOOK_URL = ""

Mongo_client = MongoClient(MongoDBUri, server_api=server_api.ServerApi('1'))
DB_Client = Mongo_client["Dorm"]

working_hours = {
    "alltime": False,
    "2025-06-02": (datetime.time(0, 0), datetime.time(23, 59)),
    "2025-06-07": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-08": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-09": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-10": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-11": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-12": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-13": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-14": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-15": (datetime.time(9, 0), datetime.time(17, 0)),
    "2025-06-16": (datetime.time(9, 0), datetime.time(17, 0)),
}

def get_cha_eun_woo_message(index, floor, room, bed):
    location = f"{floor}{room}-{bed}"
    messages = [
        f"嗨～我剛剛查到 {location} 的同學送出退宿申請了～我想第一時間告訴妳 💬",
        f"{location} 有人申請退宿了。不是什麼大事…但我只想讓妳知道。🙂",
        f"我偷偷靠近，是為了跟妳說一句話…{location} 的同學要退宿了唷 🫣",
        f"姐姐～剛剛有份新的退宿申請喔：{location} 🌸 一定要記得處理，但別太累。",
        f"今日小提醒 ✨ {location} 的同學準備退宿了，我會幫妳記住這些細節。",
        f"{location} 的退宿申請剛送出，我知道妳總是最細心～就像妳讓我放心一樣 💙",
        f"樓長姊姊 🍃 來個溫柔提醒：{location} 有同學退宿唷～記得查看一下 💌",
        f"嘿～今天也很辛苦對吧？{location} 剛剛送出退宿申請，我會陪妳一起處理 👀",
        f"我最在意的人，就是妳，所以這件事我一定要先讓妳知道：{location} 的退宿申請已送出 💫",
        f"🌙夜晚悄悄地，我也悄悄來說一聲：{location} 的退宿消息到了，妳放心，我會一直在 🖤"
    ]
    if 0 <= index < len(messages):
        return messages[index]
    else:
        return messages[index%10]
    
def get_maid_message(index, floor, room, bed):
    location = f"{floor}{room}-{bed}"
    messages = [
        f"主人～💌 小女僕來報告✨ {location} 的住宿生送出退宿申請囉～請主人稍微留意一下唷 (*´∀`)~♥",
        f"叩叩叩～👒 {location} 的同學要退宿了呢～主人辛苦了，讓小女僕幫您提醒一下📎",
        f"主～人～殿～下～💗 這裡是 {location} 的退宿通知唷，請主人查收～",
        f"咕嚕咕嚕～☕ 小女僕剛巡邏完回來，發現 {location} 有退宿申請呢～報告給主人大人！",
        f"主人主人～(*≧∀≦*) 這邊是 {location} 的新通知唷～有人申請退宿啦，小女僕立刻來回報✨",
        f"嗚呀～又有新的消息啦！📣 {location} 的孩子想退宿了呢，小女僕幫您記住了💮",
        f"✨叮咚～主人請注意✨ {location} 有退宿申請送出囉～感謝主人一直努力照顧大家💖",
        f"喵嗚～🐾 有消息來了喵！{location} 的同學想退宿喵～讓小女僕代為通報 >w<",
        f"呣嗯…小女僕剛剛拿到的退宿名單裡有 {location} 呢～主人放心，事情我幫您記著了🍰",
        f"呼呼～主人今天也辛苦了🍃這邊是小小通知：{location} 有住宿生要退宿囉，祝主人晚上好夢唷💤"
    ]
    if 0 <= index < len(messages):
        return messages[index]
    else:
        return messages[index%10]

def send_discord_notification(Floor, Room, Bed):
    random.seed(int(Floor)+int(Room)-int(Bed))
    random_index = random.randint(0,9)
    if int(Floor) < 10:
        with httpx.Client() as client:
            client.post(MALE_WEBHOOK_URL, json={
                "content": get_maid_message(random_index, Floor, Room, Bed)
            })
    else:
        with httpx.Client() as client:
            client.post(FEMALE_WEBHOOK_URL, json={
                "content": get_cha_eun_woo_message(random_index, Floor, Room, Bed)
            })

def collection_exists() -> bool:
    try:
        DB_Client.list_collection_names()
        return True
    except PyMongoError as e:
        return False
        
def is_within_custom_working_hours(dt: datetime) -> bool:
    date_str = dt.strftime("%Y-%m-%d")
    if datetime.time(12, 0) <= dt.time() <= datetime.time(13, 0):
        return False
    if working_hours["alltime"]:
        return True
    if date_str not in working_hours:
        return False
    start_time, end_time = working_hours[date_str]
    return start_time <= dt.time() <= end_time
        
#防止SQL Injection，若偵測攻擊，輸出True
def CheckInput(inputList):
    for inputString in inputList:
        #確保輸入是字串
        if not isinstance(inputString, str):
            return True
        #確保沒有特殊符號
        if (bool(re.search(r"[\${}\[\]\"']", inputString))):
            return True
    return False

def CheckLineId(inputstr):
    # 只允許英文字母、數字、.、-、_
    pattern = r'[^a-zA-Z0-9._-]'
    return re.search(pattern, inputstr) is None

def CheckPhone(inputstr):
    pattern = r'^09\d{8}$'
    return re.match(pattern, inputstr) is not None

def CheckEmail(inputstr):
    try:
        validate_email(inputstr)
        return True
    except EmailNotValidError:
        return False
    
# Check if inputs of Floor, Bed, Room is valid
def CheckFloorBedRoom(inputstrDict: dict):
    for type, inputstr in inputstrDict.items():
        if not inputstr.isdigit(): 
            return False
        if type == "Floor":
            if not 1 <= int(inputstr) <= 13:
                return False
        elif type == "Room":
            if not 1 <= int(inputstr) <= 33:
                return False
        elif type == "Bed":
            if not 1 <= int(inputstr) <= 6:
                return False
        else:
            return False
    return True

@app.route("/")
def home():
    if collection_exists():
        return "<h1>Hello World!This is For Dorm 1.</h1><h2>MongoDB is connected.</h2>" + f"<h3>{datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8))).time()}</h3>"
    else:
        return "<h1>Hello World!This is For Dorm 1.</h1><h2>MongoDB is not connected！</h2>"
    

#Home主頁的布告欄
@app.route("/api/HomeBulletinContent", methods=["POST"])
def HomeBulletinContent():
    data = json.loads(request.get_data())
    ArticlesOption = data["ArticlesOption"]
    try:
        HomeBullet = DB_Client["HomeBullet"]
        Content = HomeBullet.find({
            "Title": ArticlesOption
        })
        Content = Content[0]["Content"]
        return jsonify({
            "Content": Content
        })
    except Exception as e:
        return jsonify({
            "Content": "伺服器端出現問題，請聯絡網站管理員！"
        })
        
#主頁上顯示的總退宿人數和預約等待人數
@app.route("/api/HomeBulletin", methods=["POST"])
def HomeBulletin():
    try:
        collection = DB_Client["Appointment"]
        now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))
        dateymd = now.date().isoformat() # 2021-10-19 #用於分類
        TodayAmount = collection.count_documents({
            "AppointmentYMD": dateymd
        })
        WatingAmount = collection.count_documents({
            "Status": "Unchecked"
        })
        return jsonify({
            "TodayAmount": TodayAmount,
            "WatingAmount": WatingAmount
        })
    except Exception as e:
        return f"{e}"

#新增預約
@app.route("/api/AddAppointmentDataInterface", methods=["POST"])
def AddAppointmentDataInterface():
    now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))  # 取得目前時間（本地時間）
    if not is_within_custom_working_hours(now):
        return jsonify({'success': 'Failed', 'Cause': '目前時間不在工作時段內⛔，請直接找宿管協助退宿！'})
    # 讀取傳來的資料
    data = json.loads(request.get_data())
    # Get Floor, Room, Bed and Check them
    Floor = data["FloorValue"]
    Room = data["RoomValue"]
    Bed = data["BedValue"]
    is_valid = CheckFloorBedRoom({"Floor" : Floor, "Room": Room, "Bed": Bed})
    if not is_valid:
        return jsonify({'success': 'Failed', 'Cause': '請輸入合法資料！'})
    # Get Name and Check it
    Name = data["NameValue"]
    if len(Name) > 30:
        return jsonify({'success': 'Failed', 'Cause': '姓名長度不可超過30字！'})
    # Get Option of Contact way and check it
    ContactOption = data["ContactOptionValue"]
    if ContactOption not in ["Line", "Phone", "Email"]:
        return jsonify({'success': 'Failed', 'Cause': '請輸入合法資料！'})
    # Get ContactValue and check it
    ContactValue = data["ContactValue"]
    if CheckInput([Name, ContactValue]):
        return jsonify({ "Status": "Failed", "Cause": "不可輸入特殊符號！" })
    if ContactOption == "Line":
        is_Valid = CheckLineId(ContactValue)
        if not is_Valid:
            return jsonify({ "Status": "Failed", "Cause": "請輸入正確格式的Line Id！" })
    elif ContactOption == "Phone":
        is_Valid = CheckPhone(ContactValue)
        if not is_Valid:
            return jsonify({ "Status": "Failed", "Cause": "請輸入正確格式的電話號碼(09xxxxxxxx)！" })
    elif ContactOption == "Email":
        is_Valid = CheckEmail(ContactValue)
        if not is_Valid:
            return jsonify({ "Status": "Failed", "Cause": "請輸入正確格式的Email！" })
    #獲取當前時間
    dateymd = now.date().isoformat() # 2021-10-19 #用於分類
    datedetail = now.strftime('%Y/%m/%d %H:%M:%S') # 2021/10/19 14:48:38 #用於排序預約順序
    #連線資料庫
    collection = DB_Client["Appointment"]
    #檢查該床位是否已被登記
    count = collection.count_documents({
        "FloorValue": Floor,
        "RoomValue": Room,
        "BedValue": Bed
    })
    if count > 0:
        return jsonify({ "Status": "Failed", "Cause": "該床位已被預約或已完成退宿！" })
    collection.insert_one({
        "Status": "Unchecked",
        "Staff": "",
        "FloorValue": Floor,
        "RoomValue": Room,
        "BedValue": Bed,
        "NameValue": Name,
        "ContactOptionValue": ContactOption,
        "ContactValue": ContactValue,
        "AppointmentTimestamp": datedetail,
        "AppointmentYMD": dateymd,
        "CheckedTimestamp": ""
    })
    send_discord_notification(Floor, Room, Bed)
    return jsonify({ "Status": "Success" })

#讀取所有預約
@app.route("/api/Appointments", methods=["POST"])
def Appointments():
    data = json.loads(request.get_data())
    query = {}
    collection = DB_Client["Appointment"]
    count = collection.count_documents({})
    if count > 0 :
        cursor = collection.find(query)
        return dumps(list(cursor))
    return jsonify([])

#更改預約的狀態
@app.route("/api/ChangeAppointmentStatus", methods=["POST"])
@jwt_required()
def ChangeAppointmentStatus():
    # User Verification
    data = json.loads(request.get_data())
    Id = data["Id"]
    staffName = data["StaffName"]
    if "" in [Id, staffName]:
        return jsonify({ "Status": "Failed", "Cause": "S1，你不是管理員！" })
    # first, check if id is correct
    collection = DB_Client["Users"]
    user = collection.find_one({"_id": ObjectId(Id)})
    if not user:
        return jsonify({ "Status": "Failed", "Cause": "S2，你不是管理員！" })
    # second, check if name is matched
    if user.get("Name") != staffName:
        return jsonify({ "Status": "Failed", "Cause": "S3，你不是管理員！" })
    
    now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))
    datedetail = now.strftime('%Y/%m/%d %H:%M:%S') # 2021/10/19 14:48:38 #用於排序預約順序
    effect = data["Effect"]
    oid = data["oid"]
    AppointmentDB = DB_Client["Appointment"]
    AppointInfo = AppointmentDB.find_one({
        "_id": ObjectId(oid)
    })
    # Check if that appointment stored in database
    if not AppointInfo:
        return jsonify({ "Status": "Failed", "Cause": "該預約已被其他幹部刪除！" })
    # Check if that staff has Permission
    if effect in ["Cancel", "Qualified", "Unqualified"] and staffName != AppointInfo.get("Staff"):
        return jsonify({ "Status": "Failed", "Cause": "你沒有權限！可能此預約已由其他幹部檢查，請刷新網頁！" })
    elif effect == "Checking" and AppointInfo["Staff"] != "":
        return jsonify({ "Status": "Failed", "Cause": "此預約已由其他幹部檢查，請刷新網頁狀態！" })
    
    OriginalStatus = AppointInfo["Status"]
    
    if effect == "Delete":
        AppointmentDB.delete_one({ "_id": ObjectId(oid) })
    elif effect == "Cancel":
        AppointmentDB.update_one({ "_id": ObjectId(oid) }, 
                                 {"$set": { "Status": "Unchecked", "Staff": "", "CheckedTimestamp": "" }}, 
                                 upsert=False)
    elif effect == "Recheck" or effect == "Checking":
        AppointmentDB.update_one({ "_id": ObjectId(oid) }, 
                                 {"$set": { "Status": "Checking", "Staff": staffName, "CheckedTimestamp": datedetail }}, 
                                 upsert=False)
    elif effect == "Qualified":
        AppointmentDB.update_one({ "_id": ObjectId(oid) }, 
                                 {"$set": { "Status": "Qualified", "Staff": staffName, "CheckedTimestamp": datedetail }}, 
                                 upsert=False)
    elif effect == "Unqualified":
        AppointmentDB.update_one({ "_id": ObjectId(oid) }, 
                                 {"$set": { "Status": "Unqualified", "Staff": staffName, "CheckedTimestamp": datedetail }}, 
                                 upsert=False)
    else:
        return jsonify({ "Status": "Failed", "Cause": "S4，網站出現錯誤！" })
    ChangeLogDB = DB_Client["ChangeLog"]
    ChangeLogDB.insert_one({
        "Description": f"{staffName} {effect} the {OriginalStatus}",
        "StaffOID": Id,
        "ChangedOID": oid,
        "AppointFRB": f"{AppointInfo["FloorValue"]}{AppointInfo["RoomValue"]}-{AppointInfo["BedValue"]}",
        "AppointContact": f"{AppointInfo["ContactOptionValue"]}: {AppointInfo["ContactValue"]}",
        "timestamp": datedetail
    })
    return jsonify({ "Status": "Success" })

#管理員後台登入
@app.route("/api/UserDataInterface", methods=["POST"])
def UserDataInterface():
    # Username: sha256, Password: sha256 + bcrypto
    #讀取傳來的資料
    data = json.loads(request.get_data())
    Username = data['UserValue']
    Password = data['PasswordValue']
    #檢查輸入，避免sql注入
    if CheckInput([Username, Password]):
        return jsonify({ "Status": "Failed" })
    #連接資料庫，查看該帳號是否有存在於資料庫中
    collection = DB_Client["Users"]
    result = collection.count_documents({
        "$and":[ { "UserName": Username } ]
    })
    if not result > 0:
        return jsonify({ "Status": "Failed", "Access_Token": "none" })
    
    cursor = collection.find_one({
        "$and":[ { "UserName": Username } ]
    })
    # Check Password
    if not bcrypt.checkpw(Password.encode(), cursor["Password"].encode()):
        return jsonify({ "Status": "Failed", "Access_Token": "none" })
    Name = cursor["Name"]
    Identity = cursor["Identity"]
    user_id = json.loads(dumps(cursor))["_id"]["$oid"]
    access_token = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)
    return jsonify({ "Status": "Success", 
                    "Access_Token": access_token, 
                    "Refresh_Token": refresh_token, 
                    "Name": Name, 
                    "Identity":Identity, 
                    "Id":user_id })

'''
    以下是JWT驗證部分
'''
#認證Access Token
@app.route('/protected', methods=['POST'])
@jwt_required()
def protected(): 
    return jsonify(msg = 'Ok')

#使用Refresh Token刷新Access Token
@app.route('/refresh', methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user)
    return jsonify(msg = 'Ok', Access_Token = new_access_token)

# 錯誤處理：Token 過期
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    print("Access Token has expired")
    return jsonify({"msg": "Token has expired", "type": jwt_header["typ"]}), 200

# 錯誤處理：無效的 Token
@jwt.invalid_token_loader
def invalid_token_callback(error):
    print("Invalid Access token")
    return jsonify({"msg": "Invalid token"}), 200

# 錯誤處理：缺少 Token
@jwt.unauthorized_loader
def unauthorized_callback(error):
    print("Missing Access token")
    return jsonify({"msg": "Missing token"}), 200

# def Initial_Properties():
#     global MongoDB_user, MongoDB_password, MongoDB_host, MongoDB_port, DB_Name
#     try:
#         with open("Properties.json", "r") as json_file:
#             Properties = json.load(json_file)
#             MongoDB_user = Properties['MongoDB_user']
#             MongoDB_password = Properties['MongoDB_password']
#             MongoDB_host = Properties['MongoDB_host']
#             MongoDB_port = Properties['MongoDB_port']
#             DB_Name = Properties['DB_Name']
#     except Exception as e:
#         print("Propertise file Reading error:", str(e))

# def MongoDB_Connection():
#     try:
#         # Mongo_client = MongoClient(f"mongodb://{MongoDB_user}:{MongoDB_password}@{MongoDB_host}:{MongoDB_port}/")
#         Mongo_client = MongoClient(uri, server_api=server_api.ServerApi('1'))
#         print("MongoDB connect success")
#         DB_Client = Mongo_client[DB_Name]
#     except Exception as e:
#         print("MongoDB Connection error:", str(e)) 

if __name__ == '__main__':
    # Initial_Properties()
    # MongoDB_Connection()
    app.run()
    # app.run(debug=True)