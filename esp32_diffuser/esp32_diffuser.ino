#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ======================= KONFIGURASI =======================
const char* ssid       = "SMA-SISWA";
const char* password   = "alcent2026";

// Server domain (tanpa https:// dan tanpa / di akhir)
const char* serverHost = "diffusercgf.vercel.app";

// Harus sama persis dengan Environment Variable DEVICE_KEY di Vercel
const char* DEVICE_KEY  = "123";
// ===========================================================

const int mosfetPin      = 2;   // D2: MOSFET Diffuser
const int ledPin1        = 4;   // D4: LED Indikator 1
const int ledPin2        = 5;   // D5: LED Indikator 2
const int waterSensorPin = 34;  // D34: Sensor Air (Analog)

const int rawAirKering = 0;
const int rawAirPenuh  = 3000;
const int minWaterPercent = 10;
const unsigned long syncInterval = 2000;

bool diffuserState = false;
unsigned long lastSync = 0;

void setOutputs(bool on) {
  diffuserState = on;
  digitalWrite(mosfetPin, on ? HIGH : LOW);
  digitalWrite(ledPin1,   on ? HIGH : LOW);
  digitalWrite(ledPin2,   on ? HIGH : LOW);
}

void readWater(int &raw, int &percent) {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(waterSensorPin);
    delay(2);
  }
  raw = sum / 10;
  percent = constrain(map(raw, rawAirKering, rawAirPenuh, 0, 100), 0, 100);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Terhubung!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nGagal terhubung, mencoba lagi nanti.");
  }
}

void syncWithServer() {
  int raw, percent;
  readWater(raw, percent);

  if (percent < minWaterPercent && diffuserState) {
    setOutputs(false);
    Serial.println("Air < 10%, diffuser dimatikan otomatis.");
  }

  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(6000);

  String url = String("https://") + serverHost + "/api/device";
  if (!http.begin(client, url)) {
    Serial.println("http.begin gagal");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  String body = "{\"percent\":" + String(percent) +
                ",\"raw\":" + String(raw) +
                ",\"diffuser\":" + (diffuserState ? "true" : "false") + "}";

  int code = http.POST(body);

  if (code == 200) {
    String res = http.getString();
    bool wantOn = res.indexOf("\"diffuser\":true") >= 0;

    if (wantOn && percent < minWaterPercent) wantOn = false;
    if (wantOn != diffuserState) {
      setOutputs(wantOn);
      Serial.println(wantOn ? "Diffuser ON (dari website)" : "Diffuser OFF (dari website)");
    }
    Serial.printf("Air: %d%% | Diffuser: %s\n", percent, diffuserState ? "ON" : "OFF");
  } else {
    Serial.printf("Gagal kirim ke server, kode: %d\n", code);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(mosfetPin, OUTPUT);
  pinMode(ledPin1, OUTPUT);
  pinMode(ledPin2, OUTPUT);
  setOutputs(false);
  analogReadResolution(12);
  connectWiFi();
}

void loop() {
  connectWiFi();
  if (millis() - lastSync >= syncInterval) {
    lastSync = millis();
    syncWithServer();
  }
}
