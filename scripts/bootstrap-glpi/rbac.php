<?php

declare(strict_types=1);

/**
 * IGX NEXUS — GLPI RBAC bootstrap
 *
 * Crea y reconcilia de forma idempotente el perfil "NEXUS Asset Manager"
 * usando exclusivamente las clases internas de GLPI. No ejecuta SQL directo.
 *
 * Uso dentro del contenedor GLPI:
 *   php /tmp/igx-nexus-rbac.php --check
 *   php /tmp/igx-nexus-rbac.php --apply
 */

const NEXUS_PROFILE_NAME = 'NEXUS Asset Manager';
const NEXUS_PROFILE_COMMENT = 'Perfil operativo CMDB/ITAM de IGX NEXUS para Innergex Chile. Sin Service Desk y sin administración global.';

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, "[ERROR] {$message}\n");
    exit($code);
}

function bootstrapGlpi(): string
{
    $candidates = [
        getcwd(),
        '/var/www/glpi',
        '/var/glpi',
        '/opt/glpi',
    ];

    foreach ($candidates as $root) {
        $includes = rtrim($root, '/') . '/inc/includes.php';
        if (is_file($includes)) {
            chdir($root);
            require_once $includes;
            return $root;
        }
    }

    fail('No se encontró inc/includes.php. Ejecuta este script dentro del contenedor GLPI.');
}

function resolveProfileByName(string $name): ?Profile
{
    $profile = new Profile();
    if (!$profile->getFromDBByCrit(['name' => $name])) {
        return null;
    }
    return $profile;
}

function classRightName(string $class): ?string
{
    if (!class_exists($class)) {
        return null;
    }

    if (!property_exists($class, 'rightname')) {
        return null;
    }

    /** @phpstan-ignore-next-line */
    $right = $class::$rightname;
    return is_string($right) && $right !== '' ? $right : null;
}

function safeWriteMask(int $adminMask): int
{
    return $adminMask & ~(DELETE | PURGE);
}

function readMask(int $adminMask): int
{
    return $adminMask & READ;
}

function addDesiredRight(
    array &$desired,
    array $adminRights,
    ?string $rightName,
    string $mode,
    array &$warnings
): void {
    if ($rightName === null) {
        return;
    }

    if (!array_key_exists($rightName, $adminRights)) {
        $warnings[] = "Right '{$rightName}' no existe en el perfil Admin de esta instalación.";
        return;
    }

    $adminMask = (int) $adminRights[$rightName];
    $desired[$rightName] = match ($mode) {
        'read' => readMask($adminMask),
        'safe-write' => safeWriteMask($adminMask),
        default => throw new InvalidArgumentException("Modo de right desconocido: {$mode}"),
    };
}

function buildDesiredRights(array $adminRights, array $allCurrentRights): array
{
    // Política deny-by-default: todo right conocido parte en cero.
    $desired = array_fill_keys(array_keys($allCurrentRights), 0);
    $warnings = [];

    // Assets / CI operativos: CRUD sin DELETE/PURGE definitivo.
    $assetClasses = [
        Computer::class,
        Monitor::class,
        Software::class,
        NetworkEquipment::class,
        Printer::class,
        Phone::class,
        Peripheral::class,
        Rack::class,
        PDU::class,
        Enclosure::class,
        PassiveDCEquipment::class,
    ];

    foreach ($assetClasses as $class) {
        addDesiredRight($desired, $adminRights, classRightName($class), 'safe-write', $warnings);
    }

    // Gestión ITAM/CMDB necesaria para la línea base.
    $managementSafeWriteClasses = [
        SoftwareLicense::class,
        Document::class,
        Contract::class,
        Infocom::class,
        Certificate::class,
        Datacenter::class,
        Cluster::class,
        Domain::class,
        Appliance::class,
        DatabaseInstance::class,
        Cable::class,
    ];

    foreach ($managementSafeWriteClasses as $class) {
        addDesiredRight($desired, $adminRights, classRightName($class), 'safe-write', $warnings);
    }

    // Proveedores/contactos: consulta, no administración desde el rol operativo.
    addDesiredRight($desired, $adminRights, 'contact_enterprise', 'read', $warnings);

    // Setup mínimo para taxonomía y ubicaciones. Se usan nombres internos de rights
    // presentes en GLPI 11; si alguno no existe, el script avisa y no lo inventa.
    foreach (['device', 'dropdown', 'location', 'state'] as $rightName) {
        addDesiredRight($desired, $adminRights, $rightName, 'safe-write', $warnings);
    }

    // Administración estrictamente de lectura donde aporta contexto CMDB.
    foreach (['entity', 'inventory', 'logs'] as $rightName) {
        addDesiredRight($desired, $adminRights, $rightName, 'read', $warnings);
    }

    // Unmanaged es staging de discovery; permitir reconciliación sin borrado definitivo.
    addDesiredRight($desired, $adminRights, 'unmanaged', 'safe-write', $warnings);

    return [$desired, $warnings];
}

function printPlan(array $current, array $desired): int
{
    $changes = 0;
    $keys = array_unique(array_merge(array_keys($current), array_keys($desired)));
    sort($keys);

    foreach ($keys as $key) {
        $from = (int) ($current[$key] ?? 0);
        $to = (int) ($desired[$key] ?? 0);
        if ($from === $to) {
            continue;
        }
        $changes++;
        printf("  [CHANGE] %-32s %d -> %d\n", $key, $from, $to);
    }

    if ($changes === 0) {
        echo "  [OK] Sin cambios de rights.\n";
    }

    return $changes;
}

$mode = '--check';
foreach ($argv as $arg) {
    if ($arg === '--apply') {
        $mode = '--apply';
    } elseif ($arg === '--check') {
        $mode = '--check';
    }
}

$root = bootstrapGlpi();

echo "IGX NEXUS — GLPI RBAC Bootstrap\n";
echo "GLPI root: {$root}\n";
echo 'Modo: ' . ($mode === '--apply' ? 'APPLY' : 'CHECK (read-only)') . "\n\n";

$admin = resolveProfileByName('Admin');
if ($admin === null) {
    fail("No se encontró el perfil nativo 'Admin'.");
}

$adminId = (int) $admin->getID();
$adminRights = ProfileRight::getProfileRights($adminId);
if ($adminRights === []) {
    fail("El perfil Admin no contiene rights utilizables como referencia.");
}

$target = resolveProfileByName(NEXUS_PROFILE_NAME);
$wouldCreate = $target === null;

if ($wouldCreate) {
    echo '[MISSING] Perfil ' . NEXUS_PROFILE_NAME . "\n";
    // Para poder construir una matriz deny-by-default usamos como universo
    // los rights conocidos por Admin; al crear el perfil GLPI completará los demás.
    $currentRights = array_fill_keys(array_keys($adminRights), 0);
} else {
    $targetId = (int) $target->getID();
    if ($targetId <= 8) {
        fail('Protección activada: el perfil objetivo coincide con un perfil nativo (ID <= 8).');
    }
    echo '[OK] Perfil existente: ' . NEXUS_PROFILE_NAME . " (ID {$targetId})\n";
    $currentRights = ProfileRight::getProfileRights($targetId);
}

[$desiredRights, $warnings] = buildDesiredRights($adminRights, $currentRights);

foreach ($warnings as $warning) {
    echo "[WARN] {$warning}\n";
}

echo "\nPlan de rights:\n";
$changes = printPlan($currentRights, $desiredRights);

if ($mode !== '--apply') {
    echo "\nResumen CHECK:\n";
    echo '  Perfil a crear: ' . ($wouldCreate ? 'sí' : 'no') . "\n";
    echo "  Rights divergentes: {$changes}\n";
    echo "\n[INFO] No se realizaron escrituras.\n";
    exit(0);
}

if ($target === null) {
    $target = new Profile();
    $targetId = $target->add([
        'name' => NEXUS_PROFILE_NAME,
        'comment' => NEXUS_PROFILE_COMMENT,
        'interface' => 'central',
        'is_default' => 0,
        'helpdesk_hardware' => 0,
        'helpdesk_item_type' => [],
    ]);

    if ($targetId === false || (int) $targetId <= 8) {
        fail('No fue posible crear de forma segura el perfil NEXUS Asset Manager.');
    }

    $targetId = (int) $targetId;
    echo "\n[CREATE] Perfil creado con ID {$targetId}.\n";

    // Releer universo completo de rights generado por GLPI y mantener deny-by-default.
    $createdRights = ProfileRight::getProfileRights($targetId);
    [$desiredRights, $warningsAfterCreate] = buildDesiredRights($adminRights, $createdRights);
    foreach ($warningsAfterCreate as $warning) {
        echo "[WARN] {$warning}\n";
    }
} else {
    $targetId = (int) $target->getID();
    $target->update([
        'id' => $targetId,
        'comment' => NEXUS_PROFILE_COMMENT,
        'interface' => 'central',
        'is_default' => 0,
        'helpdesk_hardware' => 0,
        'helpdesk_item_type' => [],
    ]);
}

ProfileRight::updateProfileRights($targetId, $desiredRights);

echo "[APPLY] Rights reconciliados mediante ProfileRight::updateProfileRights().\n";

$finalRights = ProfileRight::getProfileRights($targetId);
[$expectedFinal, $finalWarnings] = buildDesiredRights($adminRights, $finalRights);
foreach ($finalWarnings as $warning) {
    echo "[WARN] {$warning}\n";
}

$remaining = printPlan($finalRights, $expectedFinal);

echo "\nVerificación final:\n";
echo "  Perfil: " . NEXUS_PROFILE_NAME . " (ID {$targetId})\n";
echo "  Divergencias restantes: {$remaining}\n";
echo "  Service Desk: deny-by-default\n";
echo "  DELETE/PURGE activos: removidos del perfil operativo\n";

if ($remaining !== 0) {
    fail('La verificación final detectó divergencias.', 2);
}

echo "\n[OK] Perfil RBAC conforme e idempotente respecto de la política declarada.\n";
