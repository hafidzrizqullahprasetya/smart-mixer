from socketio_instance import socketio
import random
import threading
import time
from datetime import datetime

class ConcreteQualityMonitor:
    def __init__(self):
        self.volume = 0
        self.simulation_active = False
        self.temperature_scheme = 'normal'
        self.cement_amount = 0
        self.simulation_events = []
        self.simulation_thread = None
        self._lock = threading.Lock()
        self.critical_seconds = [30, 31, 32]  # Detik-detik kritis

    def calculate_materials(self):
        total_ratio = 6.5
        base_unit = self.volume / total_ratio
        self.cement_amount = base_unit * 1
        return self.cement_amount
    
    def calculate_additive_amount(self, additive_type='inhibitor'):
        # Pastikan jumlah semen sudah dihitung
        if self.cement_amount == 0:
            self.calculate_materials()
            
        if additive_type == 'inhibitor':
            # 1.25% dari jumlah semen
            return round((self.cement_amount * 0.0125 * 1000), 2)  # Konversi ke ml
        elif additive_type == 'silika':
            # 7.5% dari jumlah semen
            return round((self.cement_amount * 0.075 * 1000), 2)  # Konversi ke ml
    
    def simulate_mixing(self):
        try:
            with self._lock:
                self.simulation_active = True
                self.simulation_events = []

            # Hitung jumlah semen terlebih dahulu
            self.calculate_materials()
            
            current_rpm = 30
            base_torque = 15
            additive_added = False
            mix_phase = "initial"
            inhibitor_amount = self.calculate_additive_amount('inhibitor')
            silika_amount = self.calculate_additive_amount('silika')

            socketio.emit('simulation_started', {
                'status': 'started',
                'volume': self.volume,
                'scheme': self.temperature_scheme
            })

            for second in range(60):
                if not self.simulation_active:
                    break

                # Logika fase pencampuran
                if second < 20:
                    mix_phase = "initial"
                    target_rpm = 30
                elif second < 40:
                    mix_phase = "mixing"
                    target_rpm = 30
                else:
                    mix_phase = "final"
                    target_rpm = 30

                current_rpm = target_rpm + random.uniform(-2, 2)
                
                # Logika suhu berdasarkan skema
                if self.temperature_scheme == 'normal':
                    current_temp = 25 + random.uniform(-5, 5)
                    current_torque = self._calculate_torque(current_rpm, mix_phase)
                    status = "Normal"
                    recommendation = "Baik"
                
                elif self.temperature_scheme == 'low' and second in self.critical_seconds:
                    # Suhu rendah dan torsi rendah selama 3 detik kritis
                    current_temp = 18 + random.uniform(-1, 1)  # Suhu di bawah 20°C
                    current_torque = 8 + random.uniform(-1, 1)  # Torsi rendah
                    status = "Suhu & Torsi Rendah"
                    recommendation = f"{inhibitor_amount} ml inhibitor telah ditambahkan ke campuran"
                    if second == 30:
                        additive_added = True

                elif self.temperature_scheme == 'high' and second in self.critical_seconds:
                    # Suhu tinggi dan torsi tinggi selama 3 detik kritis
                    current_temp = 31 + random.uniform(0, 1)  # Suhu di atas 30°C
                    current_torque = 35 + random.uniform(0, 2)  # Torsi tinggi
                    status = "Suhu & Torsi Tinggi"
                    recommendation = f"{silika_amount} ml silika telah ditambahkan ke campuran"
                    if second == 30:
                        additive_added = True
                
                else:
                    # Kondisi normal untuk detik-detik non-kritis
                    current_temp = 25 + random.uniform(-5, 5)
                    current_torque = self._calculate_torque(current_rpm, mix_phase)
                    status = "Normal"
                    recommendation = "Baik"

                # Format waktu
                minutes = second // 60
                seconds = second % 60
                time_str = f"{minutes:02d}:{seconds:02d}"

                data = {
                    'time': time_str,
                    'second': second,
                    'torque': round(current_torque, 2),
                    'rpm': round(current_rpm, 1),
                    'status': status,
                    'temperature': round(current_temp, 1),
                    'recommendations': recommendation,
                    'phase': mix_phase
                }

                socketio.emit('update_simulation', data)
                
                # Simpan event jika bukan status normal
                if status != "Normal":
                    self.simulation_events.append({
                        'time': second,
                        'event': f"{status} - {recommendation}"
                    })

                time.sleep(1)

            # Kirim ringkasan simulasi
            summary = self.generate_summary()
            socketio.emit('simulation_summary', {'summary': summary})
            socketio.emit('end_simulation', {'status': 'completed'})

        except Exception as e:
            print(f"Error dalam simulasi: {str(e)}")
            socketio.emit('simulation_error', {'error': str(e)})
        finally:
            with self._lock:
                self.simulation_active = False

    def _calculate_torque(self, rpm, phase):
        base_torque = {
            'initial': 15,
            'mixing': 15,
            'final': 15
        }[phase]
        
        volume_factor = self.volume / 10
        return base_torque * volume_factor + random.uniform(-2, 2)

    def generate_summary(self):
        if not self.simulation_events:
            return "Simulasi selesai. Semua parameter dalam kondisi normal."
            
        summary = [f"Simulasi selesai dengan {len(self.simulation_events)} kejadian:"]
        for event in self.simulation_events:
            summary.append(f"• Detik {event['time']}: {event['event']}")
                
        return "\n".join(summary)
    
    def stop_simulation(self):
        with self._lock:
            self.simulation_active = False
        if self.simulation_thread and self.simulation_thread.is_alive():
            self.simulation_thread.join()

    def start_simulation_thread(self):
        self.simulation_thread = threading.Thread(target=self.simulate_mixing)
        self.simulation_thread.daemon = True
        self.simulation_thread.start()