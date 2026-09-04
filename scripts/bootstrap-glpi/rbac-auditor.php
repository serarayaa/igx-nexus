<?php

declare(strict_types=1);

/**
 * IGX NEXUS — GLPI RBAC bootstrap para auditoría
 *
 * Crea y reconcilia de forma idempotente el perfil "NEXUS Auditor"
 * usando únicamente derechos de lectura relevantes para CMDB/ITAM.
 * No ejecuta SQL directo y no habilita Service Desk / Help Desk.
 *
 * Uso dentro del contenedor GLPI:
 *   php /tmp/igx-nexus-rbac-auditor.php --check
 *   php /tmp/igx-nexus-rbac-auditor.php --apply
 */

const NEXUS_AUDITOR_PROFILE_NAME = 'NEXUS Auditor';
const NEXUS_AUDITOR_PROFILE_COMMENT = 'Perfil de auditoría y consulta de IGX NEXUS para Innergex Chile. Sólo lectura CMDB/ITAM, sin Service Desk ni administración global.';

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, "[ERROR] {$message}\n");
    exit($code);
}

function bootstrapGlpi(): string
{
    global $DB;

    $candidates = [
        getcwd(),
        '/var/www/glpi',
        '/var/glpi',
        '/opt/glpi',
    ];

    $root = null;
    foreach ($candidates as $candidate) {
        $candidate = rtrim($candidate, '/');
        if (
            is_file($candidate . '/vendor/autoload.php')
            && is_file($candidate . '/src/Glpi/Application/ResourcesChecker.php')
        ) {
            $root = $candidate;
            break;
        }
    }

    if ($root === null) {
        fail('No se encontró una instalación GLPI válida. Ejecuta este script dentro del contenedor GLPI.');
    }

    chdir($root);

    require_once $root . '/src/Glpi/Application/ResourcesChecker.php';
    (new \Glpi\Application\ResourcesChecker($root))->checkResources();

    require_once $root . '/vendor/autoload.php';

    $kernel = new \Glpi\Kernel\Kernel();
    $kernel->boot();
    $GLOBALS['NEXUS_GLPI_KERNEL'] = $kernel;

    if (!($DB instanceof DBmysql) || !$DB->connected) {
        fail('GLPI no inicializó una conexión DBmysql válida.');
    }
    if (!Config::isLegacyConfigurationLoaded()) {
        fail('GLPI no pudo cargar la configuración desde la base de datos.');
    }
    if (Update::isUpdateMandatory()) {
        fail('GLPI requiere actualizar su esquema antes de ejecutar el bootstrap RBAC.');
    }

    return $root;
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
    if (!class_exists($class) || !property_exists($class, 'rightname')) {
        return null;
    }

    /** @phpstan-ignore-next-line */
    $right = $class::$rightname;
    return is_string($right) && $right !== '' ? $right : null;
}

function readMask(int $adminMask): int
{
    return $adminMask & READ;
}

function addReadRight(
    array &$desired,
    array $adminRights,
    ?string $rightName,
    array &$warnings
): void {
    if ($rightName === null) {
        return;
    }

    if (!array_key_exists($rightName, $adminRights)) {
        $warnings[] = "Right '{$rightName}' no existe en el perfil Admin de esta instalación.";
        return;
    }

    $desired[$rightName] = readMask((int) $adminRights[$rightName]);
}

function buildDesiredRights(array $adminRights, array $allCurrentRights): array
{
    // Deny-by-default: cualquier right no listado expresamente queda en 0.
    $desired = array_fill_keys(array_keys($allCurrentRights), 0);
    $warnings = [];

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
        addReadRight($desired, $adminRights, classRightName($class), $warnings);
    }

    $managementClasses = [
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

    foreach ($managementClasses as $class) {
        addReadRight($desired, $adminRights, classRightName($class), $warnings);
    }

    foreach ([
        'contact_enterprise',
        'device',
        'dropdown',
        'location',
        'state',
        'entity',
        'inventory',
        'logs',
    ] as $rightName) {
        addReadRight($desired, $adminRights, $rightName, $warnings);
    }

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

echo "IGX NEXUS — GLPI RBAC Auditor Bootstrap\n";
echo "GLPI root: {$root}\n";
echo 'Modo: ' . ($mode === '--apply' ? 'APPLY' : 'CHECK (read-only)') . "\n\n";

$admin = resolveProfileByName('Admin');
if ($admin === null) {
    fail("No se encontró el perfil nativo 'Admin'.");
}

$adminRights = ProfileRight::getProfileRights((int) $admin->getID());
if ($adminRights === []) {
    fail("El perfil Admin no contiene rights utilizables como referencia.");
}

$target = resolveProfileByName(NEXUS_AUDITOR_PROFILE_NAME);
$wouldCreate = $target === null;

if ($wouldCreate) {
    echo '[MISSING] Perfil ' . NEXUS_AUDITOR_PROFILE_NAME . "\n";
    $currentRights = array_fill_keys(array_keys($adminRights), 0);
} else {
    $targetId = (int) $target->getID();
    if ($targetId <= 8) {
        fail('Protección activada: el perfil objetivo coincide con un perfil nativo (ID <= 8).');
    }
    echo '[OK] Perfil existente: ' . NEXUS_AUDITOR_PROFILE_NAME . " (ID {$targetId})\n";
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
        'name' => NEXUS_AUDITOR_PROFILE_NAME,
        'comment' => NEXUS_AUDITOR_PROFILE_COMMENT,
        'interface' => 'central',
        'is_default' => 0,
        'helpdesk_hardware' => 0,
        'helpdesk_item_type' => [],
    ]);

    if ($targetId === false || (int) $targetId <= 8) {
        fail('No fue posible crear de forma segura el perfil NEXUS Auditor.');
    }

    $targetId = (int) $targetId;
    echo "\n[CREATE] Perfil creado con ID {$targetId}.\n";

    $createdRights = ProfileRight::getProfileRights($targetId);
    [$desiredRights, $warningsAfterCreate] = buildDesiredRights($adminRights, $createdRights);
    foreach ($warningsAfterCreate as $warning) {
        echo "[WARN] {$warning}\n";
    }
} else {
    $targetId = (int) $target->getID();
    $target->update([
        'id' => $targetId,
        'comment' => NEXUS_AUDITOR_PROFILE_COMMENT,
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
echo "  Perfil: " . NEXUS_AUDITOR_PROFILE_NAME . " (ID {$targetId})\n";
echo "  Divergencias restantes: {$remaining}\n";
echo "  Escritura CMDB/ITAM: denegada\n";
echo "  Service Desk: deny-by-default\n";
echo "  Administración global: deny-by-default\n";

if ($remaining !== 0) {
    fail('La verificación final detectó divergencias.', 2);
}

echo "\n[OK] Perfil de auditoría conforme e idempotente respecto de la política declarada.\n";
