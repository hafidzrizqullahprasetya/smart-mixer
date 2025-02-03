// Inisialisasi Socket.io
const socket = io();
let isSimulationRunning = false;
let currentSimulationData = {
  volume: null,
  temperatureScheme: null,
  events: [],
  summary: null,
};

// Event Listener Socket.io untuk pembaruan simulasi
socket.on("update_simulation", function (data) {
  if (!isSimulationRunning) return;

  // Perbarui tampilan status saat ini
  document.getElementById("currentTime").innerText = data.time;
  document.getElementById("currentTorque").innerText = data.torque + " Nm";
  document.getElementById("currentRPM").innerText = data.rpm;
  document.getElementById("currentStatus").innerText = data.status;
  document.getElementById("currentTemp").innerText = data.temperature + " °C";
  document.getElementById("currentRecommendation").innerText =
    data.recommendations;

  // Perbarui warna status
  const statusElement = document.getElementById("currentStatus");
  if (data.status.includes("Torsi Tinggi")) {
    statusElement.className = "stat-value status-danger";
  } else if (data.status.includes("Torsi Rendah")) {
    statusElement.className = "stat-value status-warning";
  } else {
    statusElement.className = "stat-value status-normal";
  }
});

// Event untuk akhir simulasi
socket.on("end_simulation", function () {
  console.log("Simulasi selesai!");
  document.getElementById("simulationStatus").innerText = "Simulasi Selesai!";
  isSimulationRunning = false;
});

// Update fungsi startSimulation untuk menyimpan data awal
async function startSimulation() {
  const volume = document.getElementById("volume").value;
  const temperatureScheme = document.querySelector(
    'input[name="temperature_scheme"]:checked'
  )?.value;

  // Di fungsi showComposition
  if (!volume || volume < 5 || volume > 20) {
    showAlert("Volume harus antara 5 - 20 liter!", "error");
    return;
  }

  // Di fungsi startSimulation
  if (!volume || volume < 5 || volume > 20) {
    showAlert("Volume harus antara 5 - 20 liter!", "error");
    return;
  }

  if (!temperatureScheme) {
    showAlert("Pilih skema suhu terlebih dahulu!", "warning");
    return;
  }

  try {
    await startCountdown();

    // Inisialisasi data simulasi baru
    currentSimulationData = {
      volume: volume,
      temperatureScheme: temperatureScheme,
      events: [],
      summary: null,
    };

    document.getElementById("simulationSection").style.display = "block";
    isSimulationRunning = true;

    const response = await fetch("/start_simulation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        volume: volume,
        temperature_scheme: temperatureScheme,
      }),
    });

    const data = await response.json();

    if (data.error) {
      showAlert(data.error, "error");
    } else {
      showAlert("Simulasi dimulai", "success");
    }
  } catch (error) {
    showAlert("Terjadi kesalahan saat memulai simulasi", "error");
    console.error("Error:", error);
  }
}

// Update socket.on untuk menyimpan events
socket.on("update_simulation", function (data) {
  if (!isSimulationRunning) return;

  // Update tampilan status saat ini
  document.getElementById("currentTime").innerText = data.time;
  document.getElementById("currentTorque").innerText = data.torque + " Nm";
  document.getElementById("currentRPM").innerText = data.rpm;
  document.getElementById("currentStatus").innerText = data.status;
  document.getElementById("currentTemp").innerText = data.temperature + " °C";
  document.getElementById("currentRecommendation").innerText =
    data.recommendations;

  // Perbarui warna status
  const statusElement = document.getElementById("currentStatus");
  if (data.status.includes("Torsi Tinggi")) {
    statusElement.className = "stat-value status-danger";
  } else if (data.status.includes("Torsi Rendah")) {
    statusElement.className = "stat-value status-warning";
  } else {
    statusElement.className = "stat-value status-normal";
  }

  // Catat event jika status tidak normal
  if (data.status !== "Normal") {
    currentSimulationData.events.push({
      time: data.time,
      status: data.status,
      temperature: data.temperature,
      torque: data.torque,
    });
  }
});

// Update socket.on untuk simulation summary
socket.on("simulation_summary", function (summary) {
  currentSimulationData.summary = summary;

  // Simpan ke localStorage
  const history = JSON.parse(localStorage.getItem("simulationHistory") || "[]");
  history.push({
    date: new Date().toISOString(),
    volume: currentSimulationData.volume,
    temperatureScheme: currentSimulationData.temperatureScheme,
    events: currentSimulationData.events,
    summary: summary,
  });
  localStorage.setItem("simulationHistory", JSON.stringify(history));

  // Update tampilan
  document.getElementById("simulationStatus").innerHTML = `
      <h4>Simulasi Selesai!</h4>
      <div class="alert alert-info mt-3">
        <h5>Kesimpulan:</h5>
        <p>${summary}</p>
      </div>
    `;

  showAlert("Data simulasi berhasil disimpan", "success");
  isSimulationRunning = false;
});

// Fungsi untuk menampilkan alert
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer");
  const alertDiv = document.createElement("div");
  alertDiv.className = `custom-alert alert-${type}`;
  alertDiv.innerHTML = `<span>${message}</span>`;

  alertContainer.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, 3000);
}

// Fungsi Countdown sebelum simulasi
function startCountdown() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const countdownDiv = document.createElement("div");
    countdownDiv.className = "countdown";
    overlay.appendChild(countdownDiv);

    let count = 3;
    const interval = setInterval(() => {
      countdownDiv.textContent = count;
      if (count === 0) {
        clearInterval(interval);
        overlay.remove();
        resolve();
      }
      count--;
    }, 1000);

    document.body.appendChild(overlay);
  });
}

// Fungsi untuk menampilkan komposisi
function showComposition() {
  const volume = document.getElementById("volume").value;
  if (!volume || volume < 5 || volume > 20) {
    alert("Volume harus antara 5 - 20 liter!");
    return;
  }

  // Total rasio adalah 1 + 2 + 3 + 0.5 = 6.5
  const totalRatio = 6.5;
  const baseUnit = volume / totalRatio;

  // Hitung jumlah berdasarkan rasio
  const cement = (baseUnit * 1).toFixed(2); // rasio 1
  const sand = (baseUnit * 2).toFixed(2); // rasio 2
  const gravel = (baseUnit * 3).toFixed(2); // rasio 3
  const water = (baseUnit * 0.5).toFixed(2); // rasio 0.5

  // Simpan nilai semen untuk perhitungan admixture
  window.cementVolume = parseFloat(cement);

  // Update tampilan
  document.getElementById("cementAmount").innerText = cement + " liter";
  document.getElementById("sandAmount").innerText = sand + " liter";
  document.getElementById("gravelAmount").innerText = gravel + " liter";
  document.getElementById("waterAmount").innerText = water + " liter";
  document.getElementById("compositionSection").style.display = "block";
  document.getElementById("additiveSection").style.display = "block";
}

// Fungsi validasi waktu bahan tambahan
function validateAdditiveTime(type, min, max) {
  const time = document.getElementById(type + "Time").value;
  if (time < min || time > max) {
    alert(`Waktu untuk ${type} harus antara ${min}-${max} menit!`);
    return false;
  }
  return true;
}

function addAdditive(type) {
  const isValid =
    type === "accelerator"
      ? validateAdditiveTime("accelerator", 30, 60)
      : validateAdditiveTime("retarder", 60, 120);
  if (!isValid) return;

  let amount =
    type === "accelerator"
      ? (window.cementVolume * 0.03 * 1000).toFixed(2) // 3% dari semen dalam ml
      : (window.cementVolume * 0.003 * 1000).toFixed(2); // 0.3% dari semen dalam ml

  const resultDiv = document.getElementById(type + "Result");
  resultDiv.innerHTML = `<div class="alert alert-success">
          Sebanyak ${amount} ml telah ditambahkan ke campuran
      </div>`;

  document.getElementById(type + "Time").disabled = true;
  document.getElementById(type + "Button").disabled = true;
}
function loadSimulationHistory() {
  const history = JSON.parse(localStorage.getItem("simulationHistory") || "[]");
  const simulationList = document.getElementById("simulationList");

  if (history.length === 0) {
    simulationList.innerHTML =
      '<div class="text-center p-4">Belum ada riwayat simulasi</div>';
    return;
  }

  // Urutkan dari yang terbaru
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  simulationList.innerHTML = history
    .map(
      (sim) => `
      <div class="simulation-item p-3 border-bottom">
        <div class="d-flex justify-content-between align-items-top">
          <div>
            <div class="mb-1">
              <strong>Tanggal:</strong> ${new Date(sim.date).toLocaleString(
                "id-ID"
              )}
            </div>
            <div>
              <strong>Volume:</strong> ${sim.volume} liter
            </div>
            <div>
              <strong>Skema Suhu:</strong> ${sim.temperatureScheme}
            </div>
            ${
              sim.events.length > 0
                ? `
              <div class="mt-2">
                <strong>Kejadian:</strong>
                <ul class="list-unstyled mb-2">
                  ${sim.events
                    .map(
                      (event) => `
                    <li class="small text-${
                      event.status.includes("Tinggi") ? "danger" : "warning"
                    }">
                      ${event.time}: ${event.status} (Suhu: ${
                        event.temperature
                      }°C, Torsi: ${event.torque} Nm)
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </div>
            `
                : ""
            }
            <div class="mt-2">
              <strong>Kesimpulan:</strong>
              <p class="mb-0 text-muted">${sim.summary}</p>
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}
// Event listener untuk modal riwayat
document
  .getElementById("historyModal")
  .addEventListener("show.bs.modal", loadSimulationHistory);
// Fungsi untuk memilih skema temperatur
function selectTemperatureScheme(scheme) {
  // Hapus kelas active dari semua tombol
  document.querySelectorAll(".temp-scheme-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Tambahkan kelas active ke tombol yang dipilih
  const selectedBtn = document.querySelector(`#${scheme}Btn`);
  if (selectedBtn) {
    selectedBtn.classList.add("active");
  }

  // Pilih radio button yang sesuai
  const radio = document.querySelector(`#${scheme}Temp`);
  if (radio) {
    radio.checked = true;
  }

  // Update text yang menunjukkan skema terpilih
  const schemeText = {
    high: "suhu tinggi (>30°C)",
    low: "suhu rendah (<20°C)",
    normal: "normal (20-30°C)",
  };

  document.getElementById(
    "selectedScheme"
  ).textContent = `Skema ${schemeText[scheme]} telah dipilih`;
}

// Event listener saat halaman dimuat
document.addEventListener("DOMContentLoaded", function () {
  // Tambahkan event listener untuk setiap tombol
  const schemeButtons = document.querySelectorAll(".temp-scheme-btn");
  schemeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const scheme = this.id.replace("Btn", "");
      selectTemperatureScheme(scheme);
    });
  });

  // Set skema default ke normal jika belum ada yang dipilih
  const activeScheme = document.querySelector(".temp-scheme-btn.active");
  if (!activeScheme) {
    selectTemperatureScheme("normal");
  }
});
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer");
  const alertDiv = document.createElement("div");
  alertDiv.className = `custom-alert alert-${type}`;
  alertDiv.innerHTML = `<span>${message}</span>`;

  alertContainer.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentElement) {
      alertDiv.remove();
    }
  }, 3000);
}
