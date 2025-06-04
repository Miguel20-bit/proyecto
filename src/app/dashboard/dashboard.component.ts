import { Component, OnInit, AfterViewInit } from '@angular/core'; // Agregamos AfterViewInit
import { Chart, registerables } from 'chart.js';
import { Client, Message } from 'paho-mqtt';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit { // Implementamos AfterViewInit
  private client!: Client;
  private grafica!: Chart;
  private graficoPronostico!: Chart;

  // Variables para mantener los valores actuales y poder mostrarlos en el HTML
  co2: string = '--';
  pm25: string = '--';
  pm10: string = '--';
  tvoc: string = '--';
  aqi: string = '--';
  alerta: string = '';
  consejo: string = ''; 


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

    // Inicializa las gráficas aquí, pero el update se hará en recibirMensaje
    // para asegurar que los datos iniciales se carguen después de la conexión
    this.initCharts();
  }

  ngAfterViewInit(): void {
    // Esto asegura que el DOM esté listo antes de intentar acceder a los elementos del semáforo.
    // También puedes asegurar que los valores iniciales de las luces estén apagados.
    this.apagarTodasLasLucesSemaforo("aqi");
    this.apagarTodasLasLucesSemaforo("tvoc"); // Aunque TVOC no tiene semáforo visual, es buena práctica si en el futuro se añade
  }

  initCharts(): void {
    this.grafica = new Chart("grafica", {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: "CO₂ (ppm)", data: [], borderColor: "red", backgroundColor: "rgba(255, 0, 0, 0.2)", fill: true, tension: 0.3 },
          { label: "PM2.5 (µg/m³)", data: [], borderColor: "blue", backgroundColor: "rgba(0, 0, 255, 0.2)", fill: true, tension: 0.3 },
          { label: "PM10 (µg/m³)", data: [], borderColor: "green", backgroundColor: "rgba(0, 255, 0, 0.2)", fill: true, tension: 0.3 },
          { label: "TVOC (ppb)", data: [], borderColor: "orange", backgroundColor: "rgba(255, 165, 0, 0.2)", fill: true, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Permite que el gráfico no mantenga su relación de aspecto original
        plugins: {
          legend: {
            display: false // Ocultamos la leyenda por defecto, la creamos con HTML para mayor control
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Hora', color: '#bbb' },
            ticks: { color: '#bbb' },
            grid: { color: '#444' }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Valor', color: '#bbb' },
            ticks: { color: '#bbb' },
            grid: { color: '#444' }
          }
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
          backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
          borderColor: "#2a2a2a",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Ocultamos la leyenda para esta gráfica
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "AQI", color: '#bbb' },
            ticks: { color: '#bbb' },
            grid: { color: '#444' }
          },
          x: {
            ticks: { color: '#bbb' },
            grid: { color: '#444' }
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
        this.co2 = valor.toFixed(2); // Usar las variables de la clase
        this.actualizarGrafica(0, hora, valor);
        break;
      case "/air/pm25":
        this.pm25 = valor.toFixed(2);
        this.actualizarGrafica(1, hora, valor);
        break;
      case "/air/pm10":
        this.pm10 = valor.toFixed(2);
        this.actualizarGrafica(2, hora, valor);
        break;
      case "/air/tvoc":
        this.tvoc = valor.toFixed(2);
        this.actualizarGrafica(3, hora, valor);
        this.actualizarConsejoGeneral("tvoc", valor); // Asegúrate de que el consejo se actualice
        break;
      case "/air/ica":
        this.aqi = valor.toFixed(0);
        this.alerta = valor > 150 ? "¡Calidad del aire muy mala!" : "";
        const color = this.actualizarSemaforo("aqi", valor, [50, 100, 150, 200, 300]);
        this.actualizarConsejoGeneral("aqi", valor);
        this.agregarFilaAlerta(hora, color, valor);
        this.actualizarPronostico();
        break;
    }
  }

  // Eliminar actualizarTexto ya que ahora usamos binding directo a las propiedades de la clase
  // actualizarTexto(id: string, valor: any) {
  //   const el = document.getElementById(id);
  //   if (el) el.textContent = valor.toString();
  // }

  actualizarGrafica(indice: number, hora: string, valor: number): void {
    const chart = this.grafica;

    if (!(chart.data.labels ?? []).includes(hora)) {
      (chart.data.labels ?? []).push(hora);
      chart.data.datasets.forEach((ds, i) => {
        if (ds.data.length < (chart.data.labels ?? []).length - 1) {
          ds.data.push(NaN); // Usar NaN para puntos de datos faltantes en el gráfico
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

  // Modificación importante para el semáforo
  actualizarSemaforo(tipo: string, valor: number, rangos: number[]): string {
    const coloresNombres = ["green", "yellow", "orange", "red", "purple", "brown"];
    const coloresHex = ["#4caf50", "#ffeb3b", "#ff9800", "#f44336", "#9c27b0", "#795548"]; // Colores más vibrantes

    let colorIndex = coloresNombres.findIndex((_, i) => valor <= (rangos[i] || Infinity));
    if (colorIndex === -1) colorIndex = coloresNombres.length - 1; // Si no encuentra, es el último (brown)

    const colorNombre = coloresNombres[colorIndex];
    const colorHex = coloresHex[colorIndex];

    this.apagarTodasLasLucesSemaforo(tipo); // Apaga todas las luces primero

    const luzActiva = document.getElementById(`light-${colorNombre}`);
    if (luzActiva) {
      luzActiva.classList.add(`active-${colorNombre}`);
    }
    return colorNombre; // Retorna el nombre del color para usarlo en la tabla
  }

  apagarTodasLasLucesSemaforo(tipo: string): void {
    const colores = ["green", "yellow", "orange", "red", "purple", "brown"];
    colores.forEach(color => {
      const luz = document.getElementById(`light-${color}`);
      if (luz) {
        luz.classList.remove(`active-${color}`);
      }
    });
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
    this.consejo = mensaje; // Actualizar la propiedad de la clase
  }

  agregarFilaAlerta(hora: string, color: string, ica: number): void {
    const fila = document.createElement("tr");
    const coloresMap: { [key: string]: string } = {
      "green": "#4caf50",
      "yellow": "#ffeb3b",
      "orange": "#ff9800",
      "red": "#f44336",
      "purple": "#9c27b0",
      "brown": "#795548"
    };
    const hexColor = coloresMap[color] || color; // Usa el color mapeado o el color original

    fila.innerHTML = `
      <td>${hora}</td>
      <td style="color:${hexColor}; font-weight: bold">${color.toUpperCase()}</td>
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
    // Asegurarse de que `this.aqi` sea un número válido
    const aqiActual = parseFloat(this.aqi || '100');
    const pronosticoData = [
      this.generarValorPronostico(aqiActual, 1),
      this.generarValorPronostico(aqiActual, 2),
      this.generarValorPronostico(aqiActual, 3)
    ];
    this.graficoPronostico.data.datasets[0].data = pronosticoData;

    // Actualizar colores de las barras según el valor de AQI
    const backgroundColors = pronosticoData.map(aqiValue => {
        if (aqiValue <= 50) return "#4caf50";
        else if (aqiValue <= 100) return "#ff9800";
        else if (aqiValue <= 150) return "#f44336";
        else if (aqiValue <= 200) return "#9c27b0"; // Purpura
        else if (aqiValue <= 300) return "#8d6e63"; // Marron (un tono diferente al brown general para la barra)
        else return "#795548"; // Marron oscuro
    });
    this.graficoPronostico.data.datasets[0].backgroundColor = backgroundColors;

    this.graficoPronostico.update();
  }

  generarValorPronostico(base: number, diasFuturo: number): number {
    const factor = diasFuturo * (0.8 + Math.random() * 0.4);
    const variacion = (Math.random() > 0.5 ? 1 : -1) * (base * 0.1 * factor);
    return Math.max(0, Math.round(base + variacion));
  }

  // Este método no se usa directamente en el nuevo diseño, pero lo mantengo
  generarAQI(): number {
    const base = parseFloat(this.aqi || '100');
    return Math.max(0, Math.round(base + (Math.random() * 60 - 30)));
  }
}