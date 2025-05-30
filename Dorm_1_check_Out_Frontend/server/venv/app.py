from flask import Flask, jsonify, request, session
from pymongo import MongoClient
from flask_cors import CORS, cross_origin
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, create_refresh_token, get_jwt_identity
from bson.json_util import dumps
from bson import ObjectId
import json
import datetime
app = Flask(__name__, static_url_path='/static')
CORS(app, resources={r"*": {"origins": "http://localhost:5173"}})
app.config['JWT_SECRET_KEY'] = "miyagawakayo"
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours = 3)  # Access Token 過期時間
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days = 14)  # Refresh Token 過期時間
jwt = JWTManager()
jwt.init_app(app)

#主頁上顯示的總退宿人數和預約等待人數
@app.route("/api/HomeBulletin", methods=["POST"])
def HomeBulletin():
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

#新增預約
@app.route("/api/AddAppointmentDataInterface", methods=["POST"])
def AddAppointmentDataInterface():
    now = datetime.datetime.now(tz=datetime.timezone(datetime.timedelta(hours=8)))
    dateymd = now.date().isoformat() # 2021-10-19 #用於分類
    datedetail = now.strftime('%Y/%m/%d %H:%M:%S') # 2021/10/19 14:48:38 #用於排序預約順序
    data = json.loads(request.get_data())
    Floor = data["FloorValue"]
    Room = data["RoomValue"]
    Bed = data["BedValue"]
    Name = data["NameValue"]
    ContactOption = data["ContactOptionValue"]
    CaontactValue = data["ContactValue"]
    collection = DB_Client["Appointment"]
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
        "ContactValue": CaontactValue,
        "AppointmentTimestamp": datedetail,
        "AppointmentYMD": dateymd,
        "CheckedTimestamp": ""
    })
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
    data = json.loads(request.get_data())
    Username = data['UserValue']
    Password = data['PasswordValue']
    collection = DB_Client["Users"]
    count = collection.count_documents({
        "UserName": Username,
        "Password": Password
    })
    ResultJson = ""
    if count > 0:
        cursor = collection.find({
            "$and":[ { "UserName": Username }, { "Password": Password } ]
        })
        Name = cursor[0]["Name"]
        user_id = json.loads(dumps(list(cursor)))[0]["_id"]["$oid"]
        access_token = create_access_token(identity=user_id)
        refresh_token = create_refresh_token(identity=user_id)
        ResultJson = { "Status": "Success", "Access_Token": access_token, "Refresh_Token": refresh_token, "Name": Name }
    else:
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

def Initial_Properties():
    global MongoDB_user, MongoDB_password, MongoDB_host, MongoDB_port, DB_Name
    try:
        with open("Properties.json", "r") as json_file:
            Properties = json.load(json_file)
            MongoDB_user = Properties['MongoDB_user']
            MongoDB_password = Properties['MongoDB_password']
            MongoDB_host = Properties['MongoDB_host']
            MongoDB_port = Properties['MongoDB_port']
            DB_Name = Properties['DB_Name']
    except Exception as e:
        print("Propertise file Reading error:", str(e))

def MongoDB_Connection():
    global DB_Client
    try:
        Mongo_client = MongoClient(f"mongodb://{MongoDB_user}:{MongoDB_password}@{MongoDB_host}:{MongoDB_port}/")
        print("MongoDB connect success")
        DB_Client = Mongo_client[DB_Name]
    except Exception as e:
        print("MongoDB Connection error:", str(e)) 

if __name__ == '__main__':
    Initial_Properties()
    MongoDB_Connection()
    app.run(debug=True, port = 8080)