<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $authenticated = isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
    
    echo json_encode([
        'authenticated' => $authenticated,
        'user' => $authenticated ? $_SESSION['admin_user'] : null,
        'role' => $authenticated ? $_SESSION['admin_role'] : null
    ]);
} else {
    echo json_encode(['authenticated' => false]);
}
?>
