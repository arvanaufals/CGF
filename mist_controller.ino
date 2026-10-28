#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ===== KONFIGURASI =====
const char* ssid     = "WIFI GURU KARYAWAN";
const char* password = "GANTI_PASSWORD_WIFI_BARU";

// Ganti dengan domain Vercel Anda
const char* SERVER_URL = "https://NAMA-PROJECT.vercel.app/api/device";
// Harus sama dengan environment variable DEVICE_KEY di Vercel
const char* DEVICE_KEY = "GANTI_DENGAN_KUNCI_RAHASIA";

// ===== PIN =====
const int mosfetPin      = 2;   // MOSFET
const int LEDPin         = 4;   // LED indikator
const int waterSensorPin = 34;  // Water sensor

// Kalibrasi sensor air
const int rawAirKering = 0;
const int rawAirPenuh  = 3000;

const int  LOW_WATER_PERCENT = 10;        // di bawah ini mist dipaksa OFF
const unsigned long SYNC_INTERVAL = 3000; // kirim data tiap 3 detik

bool mistState = false;
unsigned long lastSync = 0;

int readWaterPercent() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(waterSensorPin);
    delay(5);
  }
  int raw = sum / 10;
  int pct = map(raw, rawAirKering, rawAirPenuh, 0, 100);
  return constrain(pct, 0, 100);
}

void applyMist(bool on) {
  mistState = on;
  digitalWrite(mosfetPin, on ? HIGH : LOW);
  digitalWrite(LEDPin, on ? HIGH : LOW);
}

void connectWiFi() {
  Serial.print("Menghubungkan ke WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nTerhubung! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nGagal terhubung, akan dicoba lagi.");
  }
}

void syncWithServer(int water) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // lewati verifikasi sertifikat (sederhana)

  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(client, SERVER_URL)) return;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  char body[64];
  snprintf(body, sizeof(body), "{\"water\":%d,\"mist\":%s}", water, mistState ? "true" : "false");

  int code = http.POST(body);
  if (code == 200) {
    String res = http.getString();
    bool desired = res.indexOf("\"mist\":true") >= 0;
    // Pengaman lokal: air habis tetap OFF walau server bilang ON
    if (water < LOW_WATER_PERCENT) desired = false;
    applyMist(desired);
    Serial.printf("Air: %d%% | Mist: %s\n", water, desired ? "ON" : "OFF");
  } else {
    Serial.printf("Gagal kirim data, kode: %d\n", code);
    // Jika server tidak terjangkau, tetap jaga pengaman air
    if (water < LOW_WATER_PERCENT) applyMist(false);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(mosfetPin, OUTPUT);
  pinMode(LEDPin, OUTPUT);
  pinMode(waterSensorPin, INPUT);
  applyMist(false);
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    applyMist(false);
    connectWiFi();
  }

  if (millis() - lastSync >= SYNC_INTERVAL) {
    lastSync = millis();
    syncWithServer(readWaterPercent());
  }
}
