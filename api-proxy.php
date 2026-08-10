<?php
/** Singgah POS API proxy: forwards /api/* to Go backend 127.0.0.1:8080 (shared-hosting friendly, no mod_proxy needed). */

$backend = 'http://127.0.0.1:8080';
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
if ($path === null || $path === false) {
    $path = '/';
}
$target = $backend . $path;
$query = parse_url($uri, PHP_URL_QUERY);
if ($query) {
    $target .= '?' . $query;
}
$method = $_SERVER['REQUEST_METHOD'];

$headers = array();
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') !== 0) {
        continue;
    }
    $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
    if (in_array(strtolower($name), array('host', 'connection', 'content-length', 'transfer-encoding', 'expect', 'content-type'))) {
        continue;
    }
    $headers[] = $name . ': ' . $value;
}
if (isset($_SERVER['CONTENT_TYPE']) && $_SERVER['CONTENT_TYPE'] !== '') {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

$body = file_get_contents('php://input');

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
if ($body !== '' && $body !== false) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}
$response = curl_exec($ch);
$errno = curl_errno($ch);
$errstr = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

if ($errno !== 0 || $response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(array('error' => 'proxy_unreachable', 'detail' => $errstr));
    exit;
}

http_response_code($status);
foreach (preg_split('/\r?\n/', substr($response, 0, $headerSize)) as $line) {
    $line = trim($line);
    if ($line === '' || strpos($line, 'HTTP/') === 0) {
        continue;
    }
    $colon = strpos($line, ':');
    if ($colon === false) {
        continue;
    }
    $name = trim(substr($line, 0, $colon));
    $value = trim(substr($line, $colon + 1));
    if (in_array(strtolower($name), array('transfer-encoding', 'connection', 'keep-alive', 'upgrade'))) {
        continue;
    }
    header($name . ': ' . $value);
}
echo substr($response, $headerSize);
