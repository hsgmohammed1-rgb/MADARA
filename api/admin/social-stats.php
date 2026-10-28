<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Database configuration
$host = 'localhost';
$dbname = 'xtroet_social';
$username = 'postgres';
$password = '';

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Check authentication
function checkAuth() {
    session_start();
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (!checkAuth()) {
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        try {
            // Get current stats
            $stmt = $pdo->query("
                SELECT p.*, s.follower_count, s.last_updated, s.updated_by, s.is_active 
                FROM social_platforms p 
                LEFT JOIN social_media_stats s ON p.id = s.platform_id 
                WHERE (s.is_active = TRUE OR s.is_active IS NULL)
                ORDER BY p.platform_name
            ");
            $platforms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get update history
            $stmt = $pdo->query("
                SELECT h.*, p.platform_name 
                FROM update_history h 
                JOIN social_platforms p ON h.platform_id = p.id 
                ORDER BY h.created_at DESC 
                LIMIT 50
            ");
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'platforms' => $platforms,
                'history' => $history
            ]);
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Query failed: ' . $e->getMessage()]);
        }
        break;
        
    case 'POST':
        if (!checkAuth()) {
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['platform_key']) || !isset($input['follower_count'])) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }
        
        try {
            $pdo->beginTransaction();
            
            // Get platform ID and current count
            $stmt = $pdo->prepare("SELECT id FROM social_platforms WHERE platform_key = ?");
            $stmt->execute([$input['platform_key']]);
            $platform = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$platform) {
                echo json_encode(['error' => 'Platform not found']);
                $pdo->rollBack();
                exit;
            }
            
            $platformId = $platform['id'];
            
            // Get current stats
            $stmt = $pdo->prepare("
                SELECT follower_count FROM social_media_stats 
                WHERE platform_id = ? AND is_active = TRUE 
                ORDER BY last_updated DESC LIMIT 1
            ");
            $stmt->execute([$platformId]);
            $currentStats = $stmt->fetch(PDO::FETCH_ASSOC);
            $oldCount = $currentStats ? $currentStats['follower_count'] : 0;
            
            // Update stats
            $stmt = $pdo->prepare("
                INSERT INTO social_media_stats (platform_id, follower_count, updated_by, is_active) 
                VALUES (?, ?, ?, TRUE)
            ");
            $stmt->execute([
                $platformId,
                $input['follower_count'],
                $input['updated_by'] ?? 'admin'
            ]);
            
            // Deactivate old stats
            $stmt = $pdo->prepare("
                UPDATE social_media_stats 
                SET is_active = FALSE 
                WHERE platform_id = ? AND is_active = TRUE
            ");
            $stmt->execute([$platformId]);
            
            // Log update history
            $stmt = $pdo->prepare("
                INSERT INTO update_history (platform_id, old_count, new_count, updated_by, update_source, notes) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $platformId,
                $oldCount,
                $input['follower_count'],
                $input['updated_by'] ?? 'admin',
                $input['update_source'] ?? 'manual',
                $input['notes'] ?? ''
            ]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Stats updated successfully'
            ]);
            
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['error' => 'Update failed: ' . $e->getMessage()]);
        }
        break;
        
    default:
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
