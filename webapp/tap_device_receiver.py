from tapsdk import TapSDK, TapInputMode
from tapsdk.models import AirGestures
import concurrent.futures
import socketio
import _thread
import requests
import time

tap_instance = []
tap_identifiers = []
executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)
sio = socketio.Client()

def on_connect(identifier, name, fw):
    print(identifier + " Tap: " + str(name), " FW Version: ", fw)
    if identifier not in tap_identifiers:
        tap_identifiers.append(identifier)
    print("Connected taps:")
    for identifier in tap_identifiers:
        print(identifier)
    tap_instance.set_input_mode(TapInputMode("controller"))

def on_disconnect(identifier):
    print("Tap has disconnected")
    if identifier in tap_identifiers:
        tap_identifiers.remove(identifier)
    for identifier in tap_identifiers:
        print(identifier)


def on_mouse_event(identifier, dx, dy, isMouse):
    if isMouse:
        print(str(dx), str(dy), end='\r')
    else:
        # pass
        print("Air: ", str(dx), str(dy))

def posturl(data):
    try:
        sio.emit('tapcode', data)
        #requests.post('http://localhost:3000', json = data, timeout=1e-8)
    except Exception:
        pass

def on_tap_event(identifier, tapcode):
    print('\r'+str(tapcode), end='\r')#, flush=True)
    # tap_instance.send_vibration_sequence([100], identifier)
    data = {'tapkey':tapcode, 'tapid':identifier}
    sio.emit('tapcode', data)
    # executor.submit(posturl, data)
    #_thread.start_new_thread(posturl, (data,))
    # if int(tapcode) == 17:
    #     sequence = [500, 200, 500, 500, 500, 200]
    

def on_raw_sensor_data(identifier, raw_sensor_data):
    print(raw_sensor_data, flush=True)
    # if raw_sensor_data.GetPoint(1).z > 2000 and raw_sensor_data.GetPoint(2).z > 2000 and raw_sensor_data.GetPoint(3).z > 2000 and raw_sensor_data.GetPoint(4).z > 2000:
    #     tap_instance.set_input_mode(TapInputMode("controller"), identifier)

#old version (Tap-v1)
#TAP is Ready:Tap_D522260 (BluetoothLE#BluetoothL E98:5f:d3:36:7d:41-e4:59:17:19:dd:a4)
#BluetoothLE#BluetoothLE 98:5f:d3:36:7d:41-cb:2d:ea:4f:2b:5c Tap: Tap_D613  FW Version:  20600

#new v2
#BluetoothLE#BluetoothLE98:5f:d3:36:7d:41-c5:80:8b:5c:8d:19 Tap: Tap_D111252  FW Version:  20502(left, no ribbon)
# right D962252
def main():
    global tap_instance
    sio.connect('http://localhost:3000')
    sio.emit('tapcode', "test")
    try:
        tap_instance = TapSDK()
        tap_instance.run()
        tap_instance.register_connection_events(on_connect)
        tap_instance.register_disconnection_events(on_disconnect)
        # tap_instance.register_mouse_events(on_mouse_event)
        tap_instance.register_tap_events(on_tap_event)
        # tap_instance.register_raw_data_events(on_raw_sensor_data)
        while True:
            pass
    except KeyboardInterrupt:
        return

if __name__ == "__main__":
    main()