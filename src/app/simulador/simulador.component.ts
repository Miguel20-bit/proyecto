import { AfterViewInit, Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-simulador',
  templateUrl: './simulador.component.html',
  styleUrls: ['./simulador.component.css']
})
export class SimuladorComponent implements AfterViewInit, OnDestroy {
  private client: any;
  private intervalo: any;
  private sensorId: string = `sensor_${Math.floor(Math.random() * 1000)}`;

  ngAfterViewInit(): void {
    // Asume que Paho MQTT ya está incluido en index.html
    this.connectToBroker();
  }

  private connectToBroker(): void {
    const host = window.location.hostname === 'localhost' ? 'localhost' : 'mqtt-broker';
    this.client = new window['Paho'].MQTT.Client(host, 9001, `simulador_${Math.random().toString(16).substr(2, 8)}`);

    this.client.onConnectionLost = () => {
      console.error('Conexión perdida, reintentando...');
      setTimeout(() => this.connectToBroker(), 5000);
    };

    this.client.connect({
      onSuccess: () => {
        console.log('✅ Conectado a MQTT');
        this.intervalo = setInterval(() => this.publicarDatos(), 5000);
      },
      onFailure: (error: any) => {
        console.error('❌ Error de conexión MQTT:', error);
        setTimeout(() => this.connectToBroker(), 5000);
      },
      timeout: 10
    });
  }

  private publicarDatos(): void {
    if (!this.client || !this.client.isConnected()) {
      console.warn('MQTT no conectado, omitiendo publicación');
      return;
    }
    const co2 = Math.random() * 1000;
    const pm25 = Math.random() * 100;
    const pm10 = Math.random() * 100;
    const tvoc = Math.random() * 1000;
    const ica = Math.random() * 300;

    this.client.send("/air/co2", co2.toString());
    this.client.send("/air/pm25", pm25.toString());
    this.client.send("/air/pm10", pm10.toString());
    this.client.send("/air/tvoc", tvoc.toString());
    this.client.send("/air/ica", ica.toString());

    // Enviar también al backend para guardar en la base de datos
    this.guardarEnBaseDeDatos(this.sensorId, "/air/co2", co2, "ppm");
    this.guardarEnBaseDeDatos(this.sensorId, "/air/pm25", pm25, "µg/m³");
    this.guardarEnBaseDeDatos(this.sensorId, "/air/pm10", pm10, "µg/m³");
    this.guardarEnBaseDeDatos(this.sensorId, "/air/tvoc", tvoc, "ppb");
    this.guardarEnBaseDeDatos(this.sensorId, "/air/ica", ica, "");

    console.log(`[${this.sensorId}] 📤 Publicados:`, { co2, pm25, pm10, tvoc, ica });
  }

  private guardarEnBaseDeDatos(sensor_id: string, topico: string, valor: number, unidad: string = ""): void {
    fetch('http://localhost:3000/api/datos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor_id, topico, valor, unidad })
    }).catch(err => console.error('Error al guardar dato en backend:', err));
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    if (this.client && this.client.isConnected()) this.client.disconnect();
  }
}