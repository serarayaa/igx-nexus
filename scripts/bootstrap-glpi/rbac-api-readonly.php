<?php

declare(strict_types=1);

/**
 * IGX NEXUS — GLPI RBAC bootstrap para la service identity de NEXUS API
 *
 * Crea y reconcilia de forma idempotente el perfil "NEXUS API Read-Only"
 * usando únicamente derechos de lectura demostrados por evidencia Live en
 * V03-CMDB-01. No ejecuta SQL directo y aplica deny-by-default al resto.
 *
 * Uso dentro del contenedor GLPI:
 *   php /tmp/igx-nexus-rbac-api-readonly.php --check
 *   php /tmp/igx-nexus-rbac-api-readonly.php --apply
 */

const NEXUS_API_PROFILE_NAME = 'NEXUS API Read-Only';
const NEXUS_API_PROFILE_COMMENT = 'Perfil técnico read-only de IGX NEXUS API para Innergex Chile. Least privilege por evidencia V03-CMDB-01.';

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
        fail(
            'No se encontró una instalación GLPI válida. '
            . 'Ejecuta este script dentro del contenedor GLPI.'
        );
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

function classRightName(string $class): string
{
    if (!class_exists($class) || !property_exists($class, 'rightname')) {
        fail("La clase '{$class}' no expone rightname en esta versión de GLPI.");
    }

    /** @phpstan-ignore-next-line */
    $right = $class::$rightname;
    if (!is_string($right) || $right === '') {
        fail("La clase '{$class}' expone un rightname inválido.");
    }

    return $right;
}

function readMaskFor(array $adminRights, string $rightName): int
{
    if (!array_key_exists($rightName, $adminRights)) {
        fail(
            "Right '{$rightName}' no existe en el perfil Admin de esta instalación."
        );
    }

    $mask = ((int) $adminRights[$rightName]) & READ;
    if ($mask === 0) {
        fail(
            "Right '{$rightName}' no contiene READ en el perfil Admin; "
            . 'se rechaza inferir un mask alternativo.'
        );
    }

    return $mask;
}

/**
 * @return array<string,int>
 */
function buildDesiredRights(array $adminRights, array $currentRights): array
{
    // Deny-by-default sobre toda la superficie de rights conocida por Admin y
    // cualquier right que ya exista en el perfil objetivo.
    $allNames = array_unique(array_merge(
        array_keys($adminRights),
        array_keys($currentRights)
    ));
    $desired = array_fill_keys($allNames, 0);

    // Capabilities demostradas en V03-CMDB-01.
    $validatedRights = [
        classRightName(Computer::class),
        'device',
        classRightName(Software::class),
        classRightName(Infocom::class),
        classRightName(Contract::class),
        classRightName(Entity::class),
        classRightName(Location::class),
    ];

    foreach ($validatedRights as $rightName) {
        $desired[$rightName] = readMaskFor($adminRights, $rightName);
    }

    return $desired;
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

function metadataDrift(?Profile $profile): array
{
    if ($profile === null) {
        return ['perfil faltante'];
    }

    $drifts = [];
    $expected = [
        'comment' => NEXUS_API_PROFILE_COMMENT,
        'interface' => 'central',
        'is_default' => 0,
    ];

    foreach ($expected as $field => $value) {
        if ((string) ($profile->fields[$field] ?? '') !== (string) $value) {
            $drifts[] = $field;
        }
    }

    return $drifts;
}

$mode = '--check';
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--apply') {
        $mode = '--apply';
    } elseif ($arg === '--check') {
        $mode = '--check';
    } else {
        fail("Argumento no reconocido: {$arg}");
    }
}

$root = bootstrapGlpi();

echo "IGX NEXUS — GLPI API Read-Only RBAC Bootstrap\n";
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

$target = resolveProfileByName(NEXUS_API_PROFILE_NAME);
$wouldCreate = $target === null;

if ($wouldCreate) {
    echo '[MISSING] Perfil ' . NEXUS_API_PROFILE_NAME . "\n";
    $currentRights = [];
} else {
    $targetId = (int) $target->getID();
    if ($targetId <= 8) {
        fail(
            'Protección activada: el perfil objetivo coincide con un perfil nativo '
            . '(ID <= 8).'
        );
    }

    echo '[OK] Perfil existente: ' . NEXUS_API_PROFILE_NAME
        . " (ID {$targetId})\n";
    $currentRights = ProfileRight::getProfileRights($targetId);
}

$desiredRights = buildDesiredRights($adminRights, $currentRights);
$metadata = metadataDrift($target);

echo "\nPlan de rights:\n";
$rightsChanges = printPlan($currentRights, $desiredRights);

echo "\nMetadata:\n";
if ($metadata === []) {
    echo "  [OK] Metadata conforme.\n";
} else {
    foreach ($metadata as $field) {
        echo "  [DRIFT] {$field}\n";
    }
}

if ($mode !== '--apply') {
    echo "\nResumen CHECK:\n";
    echo '  Perfil a crear: ' . ($wouldCreate ? 'sí' : 'no') . "\n";
    echo "  Rights divergentes: {$rightsChanges}\n";
    echo '  Metadata divergente: ' . count($metadata) . "\n";
    echo "\n[INFO] No se realizaron escrituras.\n";
    exit(0);
}

if ($target === null) {
    $target = new Profile();
    $targetId = $target->add([
        'name' => NEXUS_API_PROFILE_NAME,
        'comment' => NEXUS_API_PROFILE_COMMENT,
        'interface' => 'central',
        'is_default' => 0,
        'helpdesk_hardware' => 0,
        'helpdesk_item_type' => [],
    ]);

    if ($targetId === false || (int) $targetId <= 8) {
        fail('No fue posible crear de forma segura el perfil NEXUS API Read-Only.');
    }

    $targetId = (int) $targetId;
    echo "\n[CREATE] Perfil creado con ID {$targetId}.\n";

    $createdRights = ProfileRight::getProfileRights($targetId);
    $desiredRights = buildDesiredRights($adminRights, $createdRights);
} else {
    $targetId = (int) $target->getID();
    if (!$target->update([
        'id' => $targetId,
        'comment' => NEXUS_API_PROFILE_COMMENT,
        'interface' => 'central',
        'is_default' => 0,
        'helpdesk_hardware' => 0,
        'helpdesk_item_type' => [],
    ])) {
        fail('No fue posible reconciliar metadata del perfil NEXUS API Read-Only.');
    }
}

ProfileRight::updateProfileRights($targetId, $desiredRights);
echo "[APPLY] Rights reconciliados mediante ProfileRight::updateProfileRights().\n";

$finalProfile = resolveProfileByName(NEXUS_API_PROFILE_NAME);
if ($finalProfile === null) {
    fail('El perfil desapareció durante la verificación final.');
}

$finalRights = ProfileRight::getProfileRights($targetId);
$expectedFinal = buildDesiredRights($adminRights, $finalRights);
$remainingRights = printPlan($finalRights, $expectedFinal);
$remainingMetadata = metadataDrift($finalProfile);

echo "\nVerificación final:\n";
echo "  Perfil: " . NEXUS_API_PROFILE_NAME . " (ID {$targetId})\n";
echo "  Divergencias de rights: {$remainingRights}\n";
echo '  Divergencias de metadata: ' . count($remainingMetadata) . "\n";
echo "  Escritura GLPI: denegada por policy\n";
echo "  Service Desk: deny-by-default\n";
echo "  Administración no demostrada: deny-by-default\n";

if ($remainingRights !== 0 || $remainingMetadata !== []) {
    fail('La verificación final detectó divergencias.', 2);
}

echo "\n[OK] Perfil técnico API conforme e idempotente respecto de la política validada.\n";
