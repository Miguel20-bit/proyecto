import { AfterViewInit, Component, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-simulador',
  templateUrl: './simulador.component.html',
  styleUrls: ['./simulador.component.css']
})
export class SimuladorComponent implements AfterViewInit, OnDestroy {
  private client: any;
  private intervalo: any;
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Este código se está ejecutando fuera del navegador. MQTT deshabilitado.');
      return;
    }

    this.initMqttConnection();
  }

  private initMqttConnection(): void {
    // Intenta cargar Paho si no está disponible
    if (typeof window['Paho'] === 'undefined' || !window['Paho']['MQTT']) {
      this.loadPahoScript()
        .then(() => this.connectToBroker())
        .catch(err => {
          console.error('Error al cargar Paho:', err);
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => this.initMqttConnection(), 2000 * this.retryCount);
          }
        });
    } else {
      this.connectToBroker();
    }
  }

  private loadPahoScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.1.0/paho-mqtt.min.js';
      script.async = true;
      script.onload = () => {
        // Pequeño delay para asegurar que Paho está disponible
        setTimeout(() => {
          if (typeof window['Paho'] !== 'undefined') {
            resolve();
          } else {
            reject('Paho no se definió en window después de cargar');
          }
        }, 100);
      };
      script.onerror = () => reject('Error al cargar el script');
      document.head.appendChild(script);
    });
  }

  private connectToBroker(): void {
    try {
      // Usa 'mqtt-broker' como host cuando esté en Docker (nombre del servicio en docker-compose)
      const host = window.location.hostname === 'localhost' ? 'localhost' : 'mqtt-broker';
      
      this.client = new window['Paho'].MQTT.Client(host, 9001, `simulador_${Math.random().toString(16).substr(2, 8)}`);

      this.client.onConnectionLost = (response: any) => {
        console.error('Conexión perdida:', response.errorMessage);
        setTimeout(() => this.connectToBroker(), 5000);
      };

      this.client.connect({
        onSuccess: () => {
          console.log('✅ Conectado a MQTT');
          this.retryCount = 0; // Resetear contador de reintentos
          this.intervalo = setInterval(() => this.publicarDatos(), 5000);
        },
        onFailure: (error: any) => {
          console.error('❌ Error de conexión MQTT:', error);
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => this.connectToBroker(), 3000 * this.retryCount);
          }
        },
        timeout: 10
      });
    } catch (error) {
      console.error('Error inesperado:', error);
    }
  }

  private publicarDatos(): void {
    if (!this.client || !this.client.isConnected()) {
      console.warn('MQTT no conectado, omitiendo publicación');
      return;
    }

    const payload = JSON.stringify({
      temperatura: Math.random() * 100,
      humedad: Math.random() * 100,
      timestamp: new Date().toISOString()
    });

    const message = new window['Paho'].MQTT.Message(payload);
    message.destinationName = 'datos/sensor';
    this.client.send(message);

    console.log('📤 Publicado:', payload);
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    if (this.client && this.client.isConnected()) {
      this.client.disconnect();
    }
  }
}