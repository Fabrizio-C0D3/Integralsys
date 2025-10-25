<?php
// Configuración
require_once 'config.php';

// Opcional: modo debug (usa ?debug=1 para más detalle)
$debug = isset($_GET['debug']) && $_GET['debug'] === '1';

// Crear conexión
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Verificar conexión
if ($conn->connect_error) {
    http_response_code(500);
    if ($debug) {
        echo "Error de conexión: " . $conn->connect_error;
    } else {
        echo " Error de conexión a la base de datos";
    }
    exit;
}

// Forzar charset UTF-8
$conn->set_charset('utf8mb4');

// Recibir datos del formulario (asegurarse de usar los mismos name que en el form)
$nombre   = isset($_POST['nombre']) ? trim($_POST['nombre']) : '';
$telefono = isset($_POST['telefono']) ? trim($_POST['telefono']) : '';
$correo   = isset($_POST['correo']) ? trim($_POST['correo']) : '';
$empresa  = isset($_POST['empresa']) ? trim($_POST['empresa']) : '';
$asunto   = isset($_POST['asunto']) ? trim($_POST['asunto']) : '';
$pregunta = isset($_POST['pregunta']) ? trim($_POST['pregunta']) : '';

// Validación mínima
if ($nombre === '' || $correo === '') {
    http_response_code(400);
    echo 'Faltan campos requeridos';
    $conn->close();
    exit;
}

// Validar formato de email
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo 'El correo electrónico no es válido';
    $conn->close();
    exit;
}

// Preparar e insertar con prepared statement para evitar SQL injection
$num_caso = uniqid('CASO_');
$stmt = $conn->prepare("INSERT INTO contacto (num_caso, nombre_cliente, telefono, correo, empresa, asunto, pregunta) VALUES (?, ?, ?, ?, ?, ?, ?)");
if ($stmt === false) {
    http_response_code(500);
    if ($debug) echo 'Prepare failed: ' . $conn->error;
    else echo ' Error interno al preparar la consulta';
    $conn->close();
    exit;
}

$bind = $stmt->bind_param('sssssss', $num_caso, $nombre, $telefono, $correo, $empresa, $asunto, $pregunta);
if ($bind === false && $debug) {
    // bind_param returned false — show debug info
    http_response_code(500);
    echo 'Bind failed: ' . $stmt->error;
    $stmt->close();
    $conn->close();
    exit;
}

if ($stmt->execute()) {
    http_response_code(200);
    echo " Registro guardado correctamente";
    // Redirigir después de 2 segundos si no es AJAX
    if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
        header("refresh:2;url=contact.html?success=1");
    }
} else {
    http_response_code(500);
    if ($debug) {
        echo 'Execute failed: ' . $stmt->error;
    } else {
        echo ' Error al guardar';
    }
}

$stmt->close();
$conn->close();
?>
