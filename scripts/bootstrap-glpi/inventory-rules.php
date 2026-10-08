<?php

declare(strict_types=1);

/**
 * IGX NEXUS — GLPI inventory routing rules bootstrap
 *
 * Reconciles only declarative RuleImportEntity rules owned by IGX NEXUS.
 * It uses GLPI internal application classes; it never performs direct SQL.
 *
 * Usage inside the GLPI container:
 *   php /tmp/igx-nexus-inventory-rules.php --check --config=/tmp/innergex-chile.json
 *   php /tmp/igx-nexus-inventory-rules.php --apply --config=/tmp/innergex-chile.json
 */

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
        fail('GLPI requiere actualizar su esquema antes de reconciliar reglas.');
    }

    $_SESSION['glpi_currenttime'] ??= date('Y-m-d H:i:s');

    return $root;
}

/**
 * @return array{mode:string,config:string}
 */
function parseArguments(array $argv): array
{
    $mode = '--check';
    $modeSeen = false;
    $config = '';

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--check' || $arg === '--apply') {
            if ($modeSeen && $mode !== $arg) {
                fail('Usa sólo uno de --check o --apply.');
            }
            $mode = $arg;
            $modeSeen = true;
            continue;
        }

        if (str_starts_with($arg, '--config=')) {
            $config = substr($arg, strlen('--config='));
            continue;
        }

        fail("Argumento no reconocido: {$arg}");
    }

    if ($config === '') {
        foreach ([
            __DIR__ . '/config/innergex-chile.json',
            '/tmp/igx-nexus-innergex-chile.json',
            '/tmp/innergex-chile.json',
        ] as $candidate) {
            if (is_file($candidate)) {
                $config = $candidate;
                break;
            }
        }
    }

    if ($config === '' || !is_file($config)) {
        fail(
            'No se encontró la configuración. '
            . 'Usa --config=/ruta/innergex-chile.json.'
        );
    }

    return ['mode' => $mode, 'config' => $config];
}

/**
 * @return array<string,mixed>
 */
function loadConfiguration(string $path): array
{
    try {
        $decoded = json_decode(
            (string) file_get_contents($path),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
    } catch (JsonException $e) {
        fail('JSON de configuración inválido: ' . $e->getMessage());
    }

    if (!is_array($decoded)) {
        fail('La configuración raíz debe ser un objeto JSON.');
    }

    if (!isset($decoded['inventory_routing_rules'])
        || !is_array($decoded['inventory_routing_rules'])
    ) {
        fail('Falta inventory_routing_rules en la configuración declarativa.');
    }

    return $decoded;
}

function nonEmptyString(mixed $value, string $context): string
{
    if (!is_string($value) || trim($value) === '') {
        fail("{$context} debe ser texto no vacío.");
    }
    return trim($value);
}

function resolveEntityPath(string $path): Entity
{
    $parts = array_values(array_filter(
        array_map('trim', preg_split('/\s*>\s*/', $path) ?: []),
        static fn (string $part): bool => $part !== ''
    ));

    if ($parts === []) {
        fail("Ruta de entidad inválida: {$path}");
    }

    $entity = new Entity();
    if (!$entity->getFromDB(0)) {
        fail('No fue posible resolver la entidad raíz de GLPI.');
    }

    $rootName = (string) ($entity->fields['name'] ?? '');
    if ($parts[0] !== $rootName) {
        fail(
            "La ruta '{$path}' no parte en la entidad raíz '{$rootName}'."
        );
    }

    $parentId = 0;
    for ($index = 1; $index < count($parts); $index++) {
        $child = new Entity();
        if (!$child->getFromDBByCrit([
            'name' => $parts[$index],
            'entities_id' => $parentId,
        ])) {
            fail(
                "No existe la entidad '{$parts[$index]}' debajo de ID {$parentId} "
                . "al resolver '{$path}'."
            );
        }
        $parentId = (int) $child->getID();
        $entity = $child;
    }

    return $entity;
}

function resolveLocation(string $name, int $entityId): Location
{
    $location = new Location();
    if (!$location->getFromDBByCrit([
        'name' => $name,
        'entities_id' => $entityId,
    ])) {
        fail(
            "No existe Location '{$name}' en la entidad ID {$entityId}."
        );
    }
    return $location;
}

/**
 * @return array{
 *   name:string,
 *   description:string,
 *   active:bool,
 *   match:string,
 *   criteria:array<string,array{criteria:string,condition:int,pattern:string}>,
 *   actions:array<string,array{action_type:string,field:string,value:string}>
 * }
 */
function normalizeDesiredRule(array $rule): array
{
    $name = nonEmptyString($rule['name'] ?? null, 'inventory rule.name');
    $description = (string) ($rule['description'] ?? '');
    $active = $rule['active'] ?? null;
    if (!is_bool($active)) {
        fail("Regla '{$name}': active debe ser booleano.");
    }

    $match = $rule['match'] ?? null;
    if (!in_array($match, [Rule::AND_MATCHING, Rule::OR_MATCHING], true)) {
        fail("Regla '{$name}': match debe ser AND u OR.");
    }

    $rawCriteria = $rule['criteria'] ?? null;
    $rawActions = $rule['actions'] ?? null;
    if (!is_array($rawCriteria) || $rawCriteria === []) {
        fail("Regla '{$name}': requiere al menos un criterio.");
    }
    if (!is_array($rawActions) || $rawActions === []) {
        fail("Regla '{$name}': requiere al menos una acción.");
    }

    $criteria = [];
    foreach ($rawCriteria as $item) {
        if (!is_array($item)) {
            fail("Regla '{$name}': criterio inválido.");
        }

        $field = $item['field'] ?? null;
        $operator = $item['operator'] ?? null;
        $value = nonEmptyString(
            $item['value'] ?? null,
            "Regla '{$name}': criterio.value"
        );

        if ($field !== 'inventory_tag' || $operator !== 'is') {
            fail(
                "Regla '{$name}': sólo inventory_tag + is está validado "
                . 'para este bootstrap.'
            );
        }
        if (isset($criteria['tag'])) {
            fail("Regla '{$name}': criterio inventory_tag duplicado.");
        }

        $criteria['tag'] = [
            'criteria' => 'tag',
            'condition' => Rule::PATTERN_IS,
            'pattern' => $value,
        ];
    }

    $entityPath = null;
    $locationName = null;
    foreach ($rawActions as $item) {
        if (!is_array($item)) {
            fail("Regla '{$name}': acción inválida.");
        }
        $field = $item['field'] ?? null;
        $value = nonEmptyString(
            $item['value'] ?? null,
            "Regla '{$name}': action.value"
        );

        if ($field === 'entity') {
            if ($entityPath !== null) {
                fail("Regla '{$name}': acción entity duplicada.");
            }
            $entityPath = $value;
        } elseif ($field === 'location') {
            if ($locationName !== null) {
                fail("Regla '{$name}': acción location duplicada.");
            }
            $locationName = $value;
        } else {
            fail("Regla '{$name}': acción no soportada: " . var_export($field, true));
        }
    }

    if ($entityPath === null) {
        fail("Regla '{$name}': la acción entity es obligatoria.");
    }

    $entity = resolveEntityPath($entityPath);
    $entityId = (int) $entity->getID();

    $actions = [
        'entities_id' => [
            'action_type' => 'assign',
            'field' => 'entities_id',
            'value' => (string) $entityId,
        ],
    ];

    if ($locationName !== null) {
        $location = resolveLocation($locationName, $entityId);
        $actions['locations_id'] = [
            'action_type' => 'assign',
            'field' => 'locations_id',
            'value' => (string) ((int) $location->getID()),
        ];
    }

    return [
        'name' => $name,
        'description' => $description,
        'active' => $active,
        'match' => $match,
        'criteria' => $criteria,
        'actions' => $actions,
    ];
}

/**
 * @return RuleImportEntity|null
 */
function findManagedRule(string $name): ?RuleImportEntity
{
    $model = new RuleImportEntity();
    $rows = $model->find([
        'sub_type' => RuleImportEntity::class,
        'name' => $name,
    ], 'id ASC');

    if (count($rows) > 1) {
        fail(
            "Existen múltiples RuleImportEntity con nombre '{$name}'. "
            . 'No se modificará nada hasta resolver la ambigüedad.'
        );
    }

    if ($rows === []) {
        return null;
    }

    $id = (int) array_key_first($rows);
    $rule = new RuleImportEntity();
    if (!$rule->getFromDB($id)) {
        fail("No fue posible cargar RuleImportEntity ID {$id}.");
    }

    return $rule;
}

/**
 * @return array<string,RuleCriteria>
 */
function criteriaByField(int $ruleId): array
{
    $model = new RuleCriteria(RuleImportEntity::class);
    $items = $model->getRuleCriterias($ruleId);
    $result = [];

    foreach ($items as $item) {
        $field = (string) ($item->fields['criteria'] ?? '');
        if (isset($result[$field])) {
            fail(
                "RuleImportEntity ID {$ruleId} tiene criterio '{$field}' duplicado."
            );
        }
        $result[$field] = $item;
    }

    return $result;
}

/**
 * @return array<string,RuleAction>
 */
function actionsByField(int $ruleId): array
{
    $model = new RuleAction(RuleImportEntity::class);
    $items = $model->getRuleActions($ruleId);
    $result = [];

    foreach ($items as $item) {
        $field = (string) ($item->fields['field'] ?? '');
        if (isset($result[$field])) {
            fail(
                "RuleImportEntity ID {$ruleId} tiene acción '{$field}' duplicada."
            );
        }
        $result[$field] = $item;
    }

    return $result;
}

/**
 * @param array<string,mixed> $desired
 * @return list<string>
 */
function inspectRule(RuleImportEntity $live, array $desired): array
{
    $drifts = [];

    $checks = [
        'description' => $desired['description'],
        'match' => $desired['match'],
        'is_active' => $desired['active'] ? 1 : 0,
    ];
    foreach ($checks as $field => $expected) {
        $actual = $live->fields[$field] ?? null;
        if ((string) $actual !== (string) $expected) {
            $drifts[] = "{$field}: GLPI="
                . var_export($actual, true)
                . ' deseado='
                . var_export($expected, true);
        }
    }

    $ruleId = (int) $live->getID();
    $criteria = criteriaByField($ruleId);
    foreach ($criteria as $field => $_item) {
        if (!isset($desired['criteria'][$field])) {
            $drifts[] = "criterio extra no administrado: {$field}";
        }
    }
    foreach ($desired['criteria'] as $field => $expected) {
        if (!isset($criteria[$field])) {
            $drifts[] = "criterio faltante: {$field}";
            continue;
        }
        $actual = $criteria[$field]->fields;
        foreach (['criteria', 'condition', 'pattern'] as $key) {
            if ((string) ($actual[$key] ?? '') !== (string) $expected[$key]) {
                $drifts[] = "criterio {$field}.{$key}: GLPI="
                    . var_export($actual[$key] ?? null, true)
                    . ' deseado='
                    . var_export($expected[$key], true);
            }
        }
    }

    $actions = actionsByField($ruleId);
    foreach ($actions as $field => $_item) {
        if (!isset($desired['actions'][$field])) {
            $drifts[] = "acción extra no administrada: {$field}";
        }
    }
    foreach ($desired['actions'] as $field => $expected) {
        if (!isset($actions[$field])) {
            $drifts[] = "acción faltante: {$field}";
            continue;
        }
        $actual = $actions[$field]->fields;
        foreach (['action_type', 'field', 'value'] as $key) {
            if ((string) ($actual[$key] ?? '') !== (string) $expected[$key]) {
                $drifts[] = "acción {$field}.{$key}: GLPI="
                    . var_export($actual[$key] ?? null, true)
                    . ' deseado='
                    . var_export($expected[$key], true);
            }
        }
    }

    return $drifts;
}

/**
 * Reconcile children conservatively. Extra criteria/actions inside a managed
 * rule cause a hard failure instead of being deleted automatically.
 *
 * @param array<string,mixed> $desired
 */
function applyRule(RuleImportEntity $rule, array $desired): void
{
    $ruleId = (int) $rule->getID();

    $patch = ['id' => $ruleId];
    foreach ([
        'description' => $desired['description'],
        'match' => $desired['match'],
        'is_active' => $desired['active'] ? 1 : 0,
    ] as $field => $expected) {
        if ((string) ($rule->fields[$field] ?? '') !== (string) $expected) {
            $patch[$field] = $expected;
        }
    }

    if (count($patch) > 1 && !$rule->update($patch)) {
        fail("No fue posible actualizar RuleImportEntity ID {$ruleId}.");
    }

    $criteria = criteriaByField($ruleId);
    foreach ($criteria as $field => $_item) {
        if (!isset($desired['criteria'][$field])) {
            fail(
                "Regla '{$desired['name']}' contiene criterio extra '{$field}'. "
                . 'Se rechaza eliminarlo automáticamente.'
            );
        }
    }

    foreach ($desired['criteria'] as $field => $expected) {
        if (!isset($criteria[$field])) {
            $item = new RuleCriteria(RuleImportEntity::class);
            $id = $item->add(['rules_id' => $ruleId] + $expected);
            if ($id === false) {
                fail("No fue posible crear criterio '{$field}' en regla ID {$ruleId}.");
            }
            continue;
        }

        $item = $criteria[$field];
        $update = ['id' => (int) $item->getID()];
        foreach (['criteria', 'condition', 'pattern'] as $key) {
            if ((string) ($item->fields[$key] ?? '') !== (string) $expected[$key]) {
                $update[$key] = $expected[$key];
            }
        }
        if (count($update) > 1 && !$item->update($update)) {
            fail("No fue posible actualizar criterio '{$field}' en regla ID {$ruleId}.");
        }
    }

    $actions = actionsByField($ruleId);
    foreach ($actions as $field => $_item) {
        if (!isset($desired['actions'][$field])) {
            fail(
                "Regla '{$desired['name']}' contiene acción extra '{$field}'. "
                . 'Se rechaza eliminarla automáticamente.'
            );
        }
    }

    foreach ($desired['actions'] as $field => $expected) {
        if (!isset($actions[$field])) {
            $item = new RuleAction(RuleImportEntity::class);
            $id = $item->add(['rules_id' => $ruleId] + $expected);
            if ($id === false) {
                fail("No fue posible crear acción '{$field}' en regla ID {$ruleId}.");
            }
            continue;
        }

        $item = $actions[$field];
        $update = ['id' => (int) $item->getID()];
        foreach (['action_type', 'field', 'value'] as $key) {
            if ((string) ($item->fields[$key] ?? '') !== (string) $expected[$key]) {
                $update[$key] = $expected[$key];
            }
        }
        if (count($update) > 1 && !$item->update($update)) {
            fail("No fue posible actualizar acción '{$field}' en regla ID {$ruleId}.");
        }
    }
}

/**
 * @param array<string,mixed> $desired
 */
function createRule(array $desired): RuleImportEntity
{
    $rule = new RuleImportEntity();
    $id = $rule->add([
        'name' => $desired['name'],
        'description' => $desired['description'],
        'match' => $desired['match'],
        'is_active' => $desired['active'] ? 1 : 0,
        'is_recursive' => 0,
    ]);

    if ($id === false) {
        fail("No fue posible crear RuleImportEntity '{$desired['name']}'.");
    }

    if (!$rule->getFromDB((int) $id)) {
        fail("Se creó la regla ID {$id}, pero no fue posible releerla.");
    }

    applyRule($rule, $desired);
    return $rule;
}

/**
 * @param list<array<string,mixed>> $desiredRules
 * @return array{lines:list<string>,missing:int,drifts:int,rankings:array<string,int>}
 */
function auditRules(array $desiredRules): array
{
    $lines = [];
    $missing = 0;
    $driftCount = 0;
    $rankings = [];

    foreach ($desiredRules as $desired) {
        $rule = findManagedRule($desired['name']);
        if ($rule === null) {
            $missing++;
            $lines[] = "  [MISSING] {$desired['name']}";
            continue;
        }

        $rankings[$desired['name']] = (int) ($rule->fields['ranking'] ?? 0);
        $drifts = inspectRule($rule, $desired);
        if ($drifts === []) {
            $lines[] = "  [OK] {$desired['name']}";
            continue;
        }

        $driftCount += count($drifts);
        $lines[] = "  [DRIFT] {$desired['name']}";
        foreach ($drifts as $drift) {
            $lines[] = "    - {$drift}";
        }
    }

    $expectedOrder = array_values(array_filter(
        array_map(
            static fn (array $rule): string => $rule['name'],
            $desiredRules
        ),
        static fn (string $name): bool => array_key_exists($name, $rankings)
    ));

    $actualOrder = $expectedOrder;
    usort(
        $actualOrder,
        static fn (string $a, string $b): int => $rankings[$a] <=> $rankings[$b]
    );

    if ($actualOrder !== $expectedOrder) {
        $driftCount++;
        $lines[] = '  [ORDER-DRIFT] El orden de reglas administradas no coincide '
            . 'con el orden declarativo.';
        $lines[] = '    Esperado: ' . implode(' -> ', $expectedOrder);
        $lines[] = '    GLPI: ' . implode(' -> ', $actualOrder);
    }

    return [
        'lines' => $lines,
        'missing' => $missing,
        'drifts' => $driftCount,
        'rankings' => $rankings,
    ];
}

$arguments = parseArguments($argv);
bootstrapGlpi();
$config = loadConfiguration($arguments['config']);

$rawRules = $config['inventory_routing_rules'];
$names = [];
$desiredRules = [];
foreach ($rawRules as $rawRule) {
    if (!is_array($rawRule)) {
        fail('inventory_routing_rules contiene una entrada inválida.');
    }

    $desired = normalizeDesiredRule($rawRule);
    if (isset($names[$desired['name']])) {
        fail("Nombre de regla duplicado: '{$desired['name']}'.");
    }
    $names[$desired['name']] = true;
    $desiredRules[] = $desired;
}

echo "IGX NEXUS — GLPI Inventory Routing Rules\n";
echo 'GLPI root: ' . getcwd() . "\n";
echo 'Modo: ' . ($arguments['mode'] === '--apply' ? 'APPLY' : 'CHECK (read-only)') . "\n\n";

if ($arguments['mode'] === '--apply') {
    $before = auditRules($desiredRules);
    $created = 0;
    $updated = 0;
    $unchanged = 0;

    foreach ($desiredRules as $desired) {
        $rule = findManagedRule($desired['name']);
        if ($rule === null) {
            createRule($desired);
            $created++;
            echo "  [CREATE] {$desired['name']}\n";
            continue;
        }

        $drifts = inspectRule($rule, $desired);
        if ($drifts === []) {
            $unchanged++;
            echo "  [SKIP] {$desired['name']}\n";
            continue;
        }

        applyRule($rule, $desired);
        $updated++;
        echo "  [UPDATE] {$desired['name']}\n";
    }

    echo "\nResumen APPLY:\n";
    echo "  Creadas: {$created}\n";
    echo "  Actualizadas: {$updated}\n";
    echo "  Sin cambios: {$unchanged}\n";
    echo "  Ranking: preservado; no se reordenaron reglas existentes.\n";
    echo "\nVerificación final:\n";

    $final = auditRules($desiredRules);
    foreach ($final['lines'] as $line) {
        echo $line . "\n";
    }

    if ($final['missing'] !== 0 || $final['drifts'] !== 0) {
        fail('La verificación final detectó divergencias.', 2);
    }

    echo "\n[OK] Reglas de inventario conformes e idempotentes.\n";
    exit(0);
}

$audit = auditRules($desiredRules);
foreach ($audit['lines'] as $line) {
    echo $line . "\n";
}

echo "\nResumen CHECK:\n";
echo "  Reglas faltantes: {$audit['missing']}\n";
echo "  Divergencias: {$audit['drifts']}\n";
echo "  Orden administrado: preservado; este script no mueve rankings.\n";
echo "\n[INFO] No se realizaron escrituras.\n";

exit(($audit['missing'] === 0 && $audit['drifts'] === 0) ? 0 : 2);
