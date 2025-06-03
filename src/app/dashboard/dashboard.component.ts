// dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Client, Message } from 'paho-mqtt';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private client!: Client;
  private grafica!: Chart;
  private graficoPronostico!: Chart;

  ngOnInit(): void {
    Chart.register(...registerables);

    this.client = new Client("localhost", 9001, "dashboard_" + Math.random().toString(16).substr(2, 8));

    this.client.onConnectionLost = err => console.error("Conexión perdida", err);
    this.client.onMessageArrived = this.recibirMensaje.bind(this);

    this.client.connect({
      onSuccess: () => {
        console.log("Dashboard conectado");
        this.client.subscribe("/air/co2");
        this.client.subscribe("/air/pm25");
        this.client.subscribe("/air/pm10");
        this.client.subscribe("/air/tvoc");
        this.client.subscribe("/air/ica");
      }
    });

    this.grafica = new Chart("grafica", {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: "CO₂ (ppm)", data: [], borderColor: "red", fill: false },
          { label: "PM2.5 (µg/m³)", data: [], borderColor: "blue", fill: false },
          { label: "PM10 (µg/m³)", data: [], borderColor: "green", fill: false },
          { label: "TVOC (ppb)", data: [], borderColor: "orange", fill: false }
        ]
      },
      options: {
        scales: {
          x: { title: { display: true, text: 'Hora' } },
          y: { beginAtZero: true }
        }
      }
    });

    this.graficoPronostico = new Chart("graficoPronostico", {
      type: "bar",
      data: {
        labels: this.obtenerFechasPronostico(),
        datasets: [{
          label: "Pronóstico AQI",
          data: [],
          backgroundColor: ["#4caf50", "#ff9800", "#f44336"]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "AQI" }
          }
        }
      }
    });
  }

  recibirMensaje(message: Message): void {
    const topic = message.destinationName;
    const valor = parseFloat(message.payloadString);
    const hora = new Date().toLocaleTimeString();

    switch (topic) {
      case "/air/co2":
        this.actualizarTexto("co2", valor);
        this.actualizarGrafica(0, hora, valor);
        break;
      case "/air/pm25":
        this.actualizarTexto("pm25", valor);
        this.actualizarGrafica(1, hora, valor);
        break;
      case "/air/pm10":
        this.actualizarTexto("pm10", valor);
        this.actualizarGrafica(2, hora, valor);
        break;
      case "/air/tvoc":
        this.actualizarTexto("tvoc", valor);
        this.actualizarGrafica(3, hora, valor);
        this.actualizarSemaforo("tvoc", valor, [65, 220, 660, 2200, 5500]);
        this.actualizarConsejoGeneral("tvoc", valor);
        break;
      case "/air/ica":
        this.actualizarTexto("aqi", valor);
        this.actualizarTexto("alerta", valor > 150 ? "¡Calidad del aire muy mala!" : "");
        const color = this.actualizarSemaforo("aqi", valor, [50, 100, 150, 200, 300]);
        this.actualizarConsejoGeneral("aqi", valor);
        this.agregarFilaAlerta(hora, color, valor);
        this.actualizarPronostico();
        break;
    }
  }

  actualizarTexto(id: string, valor: any) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor.toString();
  }

  actualizarGrafica(indice: number, hora: string, valor: number): void {
    const chart = this.grafica;

    if (!(chart.data.labels ?? []).includes(hora)) {
      (chart.data.labels ?? []).push(hora);
      chart.data.datasets.forEach((ds, i) => {
        if (ds.data.length < (chart.data.labels ?? []).length - 1) {
          ds.data.push(null);
        }
      });
    }
    chart.data.datasets[indice].data.push(valor);
    if ((chart.data.labels ?? []).length > 12) {
      (chart.data.labels ?? []).shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }
    chart.update();
  }

  actualizarSemaforo(tipo: string, valor: number, rangos: number[]): string {
    const colores = ["green", "yellow", "orange", "red", "purple", "brown"];
    const color = colores.find((_, i) => valor <= (rangos[i] || Infinity)) || "brown";
    const luz = document.getElementById("luz-" + tipo);
    if (luz) luz.style.backgroundColor = color;
    return color;
  }

  actualizarConsejoGeneral(tipo: string, valor: number): void {
    let mensaje = "";

    if (tipo === "aqi") {
      if (valor <= 50) mensaje = "Aire limpio. Disfruta tus actividades al aire libre.";
      else if (valor <= 100) mensaje = "Aceptable. Personas sensibles pueden notar molestias.";
      else if (valor <= 150) mensaje = "Evita exposición prolongada si eres vulnerable.";
      else if (valor <= 200) mensaje = "Reduce actividades al aire libre.";
      else if (valor <= 300) mensaje = "Peligroso para todos. Permanece en interiores.";
      else mensaje = "Muy peligroso. Quédate dentro y evita ventilar.";
    } else if (tipo === "tvoc") {
      if (valor <= 65) mensaje = "Sin riesgo. Bien ventilado.";
      else if (valor <= 220) mensaje = "Calidad aceptable, pero evita productos químicos.";
      else if (valor <= 660) mensaje = "Nivel moderado. Ventila el ambiente.";
      else if (valor <= 2200) mensaje = "Alta concentración. Evita uso de aerosoles o productos químicos.";
      else if (valor <= 5500) mensaje = "Muy contaminado. Abandona el lugar si es posible.";
      else mensaje = "Extremadamente tóxico. Riesgo grave para la salud.";
    }

    this.actualizarTexto("consejo", mensaje);
  }

  agregarFilaAlerta(hora: string, color: string, ica: number): void {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${hora}</td>
      <td style="color:${color}; font-weight: bold">${color.toUpperCase()}</td>
      <td>${ica}</td>`;
    const tabla = document.getElementById("tabla-alertas");
    if (tabla) tabla.prepend(fila);
  }

  obtenerFechasPronostico(): string[] {
    const fechas: string[] = [];
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    for (let i = 0; i < 3; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      fechas.push(fecha.toLocaleDateString('es-ES', opciones));
    }
    return fechas;
  }

  actualizarPronostico(): void {
    const aqiActual = parseFloat(document.getElementById("aqi")?.textContent || '100');
    const pronosticoData = [
      this.generarValorPronostico(aqiActual, 1),
      this.generarValorPronostico(aqiActual, 2),
      this.generarValorPronostico(aqiActual, 3)
    ];
    this.graficoPronostico.data.datasets[0].data = pronosticoData;
    this.graficoPronostico.update();
  }

  generarValorPronostico(base: number, diasFuturo: number): number {
    const factor = diasFuturo * (0.8 + Math.random() * 0.4);
    const variacion = (Math.random() > 0.5 ? 1 : -1) * (base * 0.1 * factor);
    return Math.max(0, Math.round(base + variacion));
  }

  generarAQI(): number {
    const base = parseFloat(document.getElementById("aqi")?.textContent || '100');
    return Math.max(0, Math.round(base + (Math.random() * 60 - 30)));
  }
}
