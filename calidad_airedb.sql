-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS calidad_aire 
USE calidad_aire;

-- Crear tabla para guardar datos históricos de los sensores
CREATE TABLE IF NOT EXISTS datos_sensores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topico VARCHAR(50) NOT NULL,          -- Ej: /air/pm25, /air/co2
    valor DECIMAL(10,2) NOT NULL,         -- Valor numérico del sensor
    unidad VARCHAR(10),                   -- Ej: µg/m3, ppm, ppb (opcional)
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP -- Fecha y hora de registro
);

-- Crear tabla para historial de alertas
CREATE TABLE IF NOT EXISTS alertas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    color VARCHAR(20) NOT NULL,
    nivel_ica INT NOT NULL
);

-- AQI (ICA) en diferentes rangos para probar el semáforo de AQI
INSERT INTO datos_sensores (topico, valor, unidad) VALUES
('/air/ica', 30, ''),    -- Verde
('/air/ica', 75, ''),    -- Amarillo
('/air/ica', 120, ''),   -- Naranja
('/air/ica', 180, ''),   -- Rojo
('/air/ica', 250, ''),   -- Morado
('/air/ica', 350, '');   -- Marrón

-- TVOC en diferentes rangos para probar el semáforo de TVOC
INSERT INTO datos_sensores (topico, valor, unidad) VALUES
('/air/tvoc', 50, 'ppb'),    -- Verde
('/air/tvoc', 200, 'ppb'),    -- Amarillo
('/air/tvoc', 500, 'ppb'),    -- Naranja
('/air/tvoc', 1000, 'ppb'),   -- Rojo
('/air/tvoc', 3000, 'ppb'),   -- Morado
('/air/tvoc', 6000, 'ppb');   -- Marrón

INSERT INTO datos_sensores (topico, valor, unidad) VALUES
('/air/co2', 400, 'ppm'),
('/air/pm25', 12, 'µg/m³'),
('/air/pm10', 20, 'µg/m³');


INSERT INTO datos_sensores (topico, valor, unidad) VALUES ('/air/ica', 180, '');

INSERT INTO datos_sensores (topico, valor, unidad) VALUES ('/air/tvoc', 500, 'ppb');

INSERT INTO datos_sensores (topico, valor, unidad, fecha_hora)
VALUES
  ('/air/ica', 80, '', '2024-01-15 10:00:00'),
  ('/air/ica', 120, '', '2024-03-22 12:30:00'),
  ('/air/ica', 60, '', '2024-06-10 09:15:00'),
  ('/air/ica', 100, '', '2024-09-05 14:45:00'),
  ('/air/ica', 90, '', '2024-12-20 18:20:00');