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
import re
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
uri = ""

Mongo_client = MongoClient(uri, server_api=server_api.ServerApi('1'))
DB_Client = Mongo_client[""]
def collection_exists() -> bool:
    try:
        collections = DB_Client.list_collection_names()
        return True
    except PyMongoError as e:
        return False

MALE_WEBHOOK_URL = ""
FEMALE_WEBHOOK_URL = ""
def send_discord_notification_for_male(Floor, Room, Bed, Name, ContactOption, ContactValue):
    with httpx.Client() as client:
        client.post(MALE_WEBHOOK_URL, json={
            "content": f"""
🌸樓長主人大人～💗
有一位住宿生送出退宿檢查申請囉✨

📍住宿位置：{Floor}{Room}-{Bed}
🧸小名：{Name}
📱可以用 {ContactOption} 聯絡唷！
🔍{ContactOption} 是：{ContactValue}

請主人們稍微留意一下吧～🍰
辛苦您們了～祝您今天也萌萌的💖(｡•ㅅ•｡)ゝ
            """
        })
        
def send_discord_notification_for_female(Floor, Room, Bed, Name, ContactOption, ContactValue):
    with httpx.Client() as client:
        client.post(FEMALE_WEBHOOK_URL, json={
            "content": f"""
🌟 嗨～親愛的樓長姐姐💖
剛剛收到一份新的退宿預約申請，想第一時間告訴妳 😊

🏠 住宿位置：{Floor}{Room}-{Bed}
🐥 他的暱稱：{Name}
📲 他願意用 {ContactOption} 聯絡妳喔～
🔍 {ContactOption} 是：{ContactValue} ✨

辛苦的妳總是這麼負責又貼心～
如果有什麼需要幫忙的地方，記得也跟我說唷 💬
我會一直在這裡陪著妳 🌌
            """
        })
        
#檢查預約時間是否有在營業日內
# 定義可預約的工作時間（key為日期字串，value為 (start_time, end_time)）
working_hours = {
    "alltime": False,
    "2025-05-31": (datetime.time(0, 0), datetime.time(23, 0)),
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
        # return jsonify({
        #     "TodayAmount": 6969,
        #     "WatingAmount": 6969,
        #     "err": f"{e}" })
        return f"{e}"

#新增預約
@app.route("/api/AddAppointmentDataInterface", methods=["POST"])
def AddAppointmentDataInterface():
    now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))  # 取得目前時間（本地時間）
    if not is_within_custom_working_hours(now):
        return jsonify({'success': 'Failed', 'Cause': '目前時間不在工作時段內⛔，請直接找宿管協助退宿！'})
    # 讀取傳來的資料
    data = json.loads(request.get_data())
    Floor = data["FloorValue"]
    Room = data["RoomValue"]
    Bed = data["BedValue"]
    Name = data["NameValue"]
    ContactOption = data["ContactOptionValue"]
    ContactValue = data["ContactValue"]
    # 過濾資料
    if CheckInput([Name, ContactValue]):
        return jsonify({ "Status": "Failed", "Cause": "不可輸入特殊符號！" })
    #獲取當前時間
    now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))
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
    if int(Floor) < 10:
        send_discord_notification_for_male(Floor, Room, Bed, Name, ContactOption, ContactValue)
    else:
        send_discord_notification_for_female(Floor, Room, Bed, Name, ContactOption, ContactValue)
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
def ChangeAppointmentStatus():
    now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))
    datedetail = now.strftime('%Y/%m/%d %H:%M:%S') # 2021/10/19 14:48:38 #用於排序預約順序
    data = json.loads(request.get_data())
    effect = data["Effect"]
    oid = data["oid"]
    staffName = data["StaffName"]
    AppointmentDB = DB_Client["Appointment"]
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
        return jsonify({ "Status": "Failed" })
    ChangeLogDB = DB_Client["ChangeLog"]
    ChangeLogDB.insert_one({
        "Effect": effect,
        "ChangedOID": oid,
        "StaffName": staffName,
        "timestamp": datedetail
    })
    return jsonify({ "Status": "Success" })

#管理員後台登入
@app.route("/api/UserDataInterface", methods=["POST"])
def UserDataInterface():
    #讀取傳來的資料
    data = json.loads(request.get_data())
    Username = data['UserValue']
    Password = data['PasswordValue']
    #檢查輸入，避免sql注入
    if CheckInput([Username, Password]):
        return jsonify({ "Status": "Failed" })
    #連接資料庫，查看該帳密是否有存在於資料庫中
    collection = DB_Client["Users"]
    count = collection.count_documents({
        "UserName": Username,
        "Password": Password
    })
    ResultJson = ""
    if count > 0: #若帳密正確
        cursor = collection.find({
            "$and":[ { "UserName": Username }, { "Password": Password } ]
        })
        Name = cursor[0]["Name"]
        Identity = cursor[0]["Identity"]
        user_id = json.loads(dumps(list(cursor)))[0]["_id"]["$oid"]
        access_token = create_access_token(identity=user_id)
        refresh_token = create_refresh_token(identity=user_id)
        ResultJson = { "Status": "Success", "Access_Token": access_token, "Refresh_Token": refresh_token, "Name": Name, "Identity":Identity }
    else: #若帳密不正確
        ResultJson = { "Status": "Failed", "Access_Token": "none" }
    return jsonify(ResultJson)

'''
    以下是JWT驗證部分
'''
#認證Access Token
@app.route('/protected', methods=['POST'])
@jwt_required()
def protected(): 
    current_user = get_jwt_identity()
    return jsonify(msg = 'Ok', user = current_user)

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
    # app.run()
    app.run(debug=True)