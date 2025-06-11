-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS calidad_aire 
USE calidad_aire;

-- Crear tabla para guardar datos históricos de los sensores
CREATE TABLE IF NOT EXISTS datos_sensores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(50),   
    topico VARCHAR(50) NOT NULL,          
    valor DECIMAL(10,2) NOT NULL,         
    unidad VARCHAR(10),                   
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP 
);

-- Crear tabla para historial de alertas
CREATE TABLE IF NOT EXISTS alertas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    color VARCHAR(20) NOT NULL,
    nivel_ica INT NOT NULL
);