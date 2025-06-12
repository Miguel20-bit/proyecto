# ProyectoTW

Este proyecto incluye una aplicación Angular, una API en Node.js y un broker MQTT para monitorear y consultar datos relacionados con la calidad del aire.

## Requisitos
- Docker y Docker Compose instalados.
- Node.js versión 18 o superior.
- MySQL instalado localmente.

## Construcción del proyecto
1. Clona el repositorio:
   ```bash
   git clone <URL-del-repositorio>
   cd proyecto
   ```

2. Levanta los servicios con Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Alternativamente, puedes usar el siguiente script si está configurado en el archivo `package.json`:
   ```bash
   npm run start:docker
   ```

4. Accede a los servicios:
   - **Aplicación Angular**: [http://localhost:4200](http://localhost:4200)
   - **API**: [http://localhost:3000](http://localhost:3000)

## Base de datos
La base de datos debe crearse manualmente:
1. Accede a tu servidor MySQL local.
2. Crea la base de datos:
   ```sql
   CREATE DATABASE calidad_aire;
   USE calidad_aire;
   ```
3. Crea las tablas necesarias:
   ```sql
   CREATE TABLE datos_sensores (
       id INT AUTO_INCREMENT PRIMARY KEY,
       sensor_id VARCHAR(255),
       topico VARCHAR(255),
       valor FLOAT,
       unidad VARCHAR(255),
       fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE alertas (
       id INT AUTO_INCREMENT PRIMARY KEY,
       color VARCHAR(255),
       nivel_ica FLOAT,
       fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

## Notas
- Usa `host.docker.internal` como host para conectar la API a la base de datos local.
