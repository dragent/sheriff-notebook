<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CountyReferenceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: CountyReferenceRepository::class)]
#[ORM\Table(name: 'county_reference')]
class CountyReference
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'json')]
    private array $data;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /**
     * Optimistic lock revision incremented by Doctrine on each successful flush.
     * Prevents two simultaneous PUT /api/reference from silently overwriting each other.
     */
    #[ORM\Version]
    #[ORM\Column(type: 'integer', options: ['default' => 1])]
    private int $version = 1;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->data = self::defaultData();
        $this->updatedAt = new \DateTimeImmutable('now');
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    /**
     * itemCategories : liste de catégories (id, name, items). Chaque catégorie peut être ouverte/fermée en affichage.
     * homeInfoCategories : catégories d'informations affichées sur la page d'accueil (id, name, order, infos: id, title, content, order).
     * formations : catalogue des formations (id, label) créées par l'admin.
     * formationsByGrade : par grade, liste d'ids de formations (formationIds). Héritage : rangs supérieurs ont aussi les formations des rangs inférieurs.
     *
     * @return array{
     *   fusil: list<string>,
     *   carabine: list<string>,
     *   fusilAPompe: list<string>,
     *   revolver: list<string>,
     *   pistolet: list<string>,
     *   armeBlanche: list<string>,
     *   itemCategories: list<array{id: string, name: string, items: list<array{name: string, destructionValue?: string}>}>,
     *   contraventions: list<array{label: string, amende: string, prisonTime: string}>,
     *   homeInfoCategories: list<array{id: string, name: string, order?: int, infos: list<array{id: string, title: string, content: string, order?: int}>}>,
     *   formations: list<array{id: string, label: string}>,
     *   formationsByGrade: list<array{grade: string, formationIds: list<string>}>
     * }
     */
    public function getData(): array
    {
        $default = self::defaultData();
        $result = array_merge($default, $this->data);
        if (isset($this->data['carabines']) && \is_array($this->data['carabines']) && empty($result['carabine'])) {
            $result['carabine'] = $this->data['carabines'];
        }
        if (isset($this->data['revolvers']) && \is_array($this->data['revolvers']) && empty($result['revolver'])) {
            $result['revolver'] = $this->data['revolvers'];
        }
        if (isset($this->data['armes']) && \is_array($this->data['armes']) && empty($result['armeBlanche'])) {
            $result['armeBlanche'] = $this->data['armes'];
        }
        if (empty($result['itemCategories']) && isset($result['items']) && \is_array($result['items'])) {
            $items = $result['items'];
            if (isset($this->data['destruction']) && \is_array($this->data['destruction']) && !$this->hasUnifiedItems($items)) {
                $destructionByName = [];
                foreach ($this->data['destruction'] as $d) {
                    if (isset($d['name'])) {
                        $destructionByName[$d['name']] = $d['value'] ?? '';
                    }
                }
                foreach ($items as $i => $item) {
                    $name = $item['name'] ?? '';
                    if ('' !== $name && isset($destructionByName[$name])) {
                        $items[$i]['destructionValue'] = $destructionByName[$name];
                    }
                }
            }
            $result['itemCategories'] = [['id' => 'default', 'name' => 'Items', 'items' => $items]];
        }
        if (isset($result['formationsByGrade']) && \is_array($result['formationsByGrade'])) {
            foreach ($result['formationsByGrade'] as $i => $cfg) {
                if (\is_array($cfg) && isset($cfg['keys']) && !isset($cfg['formationIds'])) {
                    $result['formationsByGrade'][$i]['formationIds'] = $cfg['keys'];
                }
            }
        }
        $weaponKeys = ['fusil', 'carabine', 'fusilAPompe', 'revolver', 'pistolet', 'armeBlanche'];
        foreach ($weaponKeys as $wk) {
            if (isset($result[$wk]) && \is_array($result[$wk])) {
                $result[$wk] = $this->normalizeWeaponArray($result[$wk]);
            }
        }
        if (isset($result['itemCategories']) && \is_array($result['itemCategories'])) {
            $result['itemCategories'] = $this->sanitizeItemCategories($result['itemCategories']);
        }
        $keys = [
            'fusil',
            'carabine',
            'fusilAPompe',
            'revolver',
            'pistolet',
            'armeBlanche',
            'itemCategories',
            'contraventions',
            'homeInfoCategories',
            'formations',
            'formationsByGrade',
        ];

        return array_intersect_key($result, array_flip($keys));
    }

    /** @param array<int, mixed> $arr
     * @return list<array{name: string, destructionValue: string}>
     */
    private function normalizeWeaponArray(array $arr): array
    {
        $out = [];
        foreach ($arr as $el) {
            if (\is_string($el)) {
                $name = trim($el);
                if ('' !== $name) {
                    $out[] = ['name' => $name, 'destructionValue' => ''];
                }
                continue;
            }
            if (\is_array($el) && isset($el['name']) && \is_string($el['name'])) {
                $name = trim($el['name']);
                if ('' !== $name) {
                    $out[] = [
                        'name' => $name,
                        'destructionValue' => isset($el['destructionValue']) && \is_string($el['destructionValue'])
                            ? $el['destructionValue'] : '',
                    ];
                }
            }
        }

        return $out;
    }

    /** @param list<array<string, mixed>> $items */
    private function hasUnifiedItems(array $items): bool
    {
        foreach ($items as $item) {
            if (\array_key_exists('destructionValue', $item)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array{
     *   fusil?: list<string>,
     *   carabine?: list<string>,
     *   fusilAPompe?: list<string>,
     *   revolver?: list<string>,
     *   pistolet?: list<string>,
     *   armeBlanche?: list<string>,
     *   itemCategories?: list<array{id: string, name: string, items: list<array{name: string, destructionValue?: string}>}>,
     *   contraventions?: list<array{label: string, amende: string, prisonTime: string}>,
     *   homeInfoCategories?: list<array{id: string, name: string, order?: int, infos: list<array{id: string, title: string, content: string, order?: int}>}>,
     *   formations?: list<array{id: string, label: string}>,
     *   formationsByGrade?: list<array{grade: string, formationIds: list<string>}>
     * } $data
     */
    public function setData(array $data): void
    {
        $default = self::defaultData();
        $keys = [
            'fusil',
            'carabine',
            'fusilAPompe',
            'revolver',
            'pistolet',
            'armeBlanche',
            'itemCategories',
            'contraventions',
            'homeInfoCategories',
            'formations',
            'formationsByGrade',
        ];
        $newData = [];
        $weaponKeysList = ['fusil', 'carabine', 'fusilAPompe', 'revolver', 'pistolet', 'armeBlanche'];
        foreach ($keys as $key) {
            if (isset($data[$key]) && \is_array($data[$key]) && [] !== $data[$key]) {
                // Tableau non vide : enregistrer les données reçues (normaliser les armes).
                if (\in_array($key, $weaponKeysList, true)) {
                    $newData[$key] = $this->normalizeWeaponArray($data[$key]);
                } elseif ('itemCategories' === $key) {
                    $newData[$key] = $this->sanitizeItemCategories($data[$key]);
                } else {
                    $newData[$key] = $data[$key];
                }
            } elseif (isset($data[$key]) && \is_array($data[$key]) && [] === $data[$key]) {
                // Ne pas écraser par des tableaux vides (garder l’existant ou défaut).
                $newData[$key] = $this->data[$key] ?? $default[$key];
            } elseif (isset($this->data[$key])) {
                $newData[$key] = $this->data[$key];
            } else {
                $newData[$key] = $default[$key];
            }
        }
        // New array reference so Doctrine detects JSON column change.
        $this->data = $newData;
        $this->updatedAt = new \DateTimeImmutable('now');
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getVersion(): int
    {
        return $this->version;
    }

    /**
     * @return array{
     *   fusil: list<string>,
     *   carabine: list<string>,
     *   fusilAPompe: list<string>,
     *   revolver: list<string>,
     *   pistolet: list<string>,
     *   armeBlanche: list<string>,
     *   itemCategories: list<array{id: string, name: string, items: list<array{name: string, destructionValue?: string}>}>,
     *   contraventions: list<array{label: string, amende: string, prisonTime: string}>,
     *   homeInfoCategories: list<array{id: string, name: string, order?: int, infos: list<array{id: string, title: string, content: string, order?: int}>}>,
     *   formations: list<array{id: string, label: string}>,
     *   formationsByGrade: list<array{grade: string, formationIds: list<string>}>
     * }
     */
    public static function defaultData(): array
    {
        return [
            'fusil' => [],
            'carabine' => [],
            'fusilAPompe' => [],
            'revolver' => [],
            'pistolet' => [],
            'armeBlanche' => [],
            'itemCategories' => [],
            'contraventions' => [],
            'homeInfoCategories' => [],
            'formations' => [],
            'formationsByGrade' => [],
        ];
    }

    /**
     * Remove deprecated "value" key from reference items.
     *
     * @param list<array<string, mixed>> $categories
     *
     * @return list<array<string, mixed>>
     */
    private function sanitizeItemCategories(array $categories): array
    {
        $cleaned = [];
        foreach ($categories as $category) {
            if (!\is_array($category)) {
                continue;
            }

            $items = $category['items'] ?? [];
            if (\is_array($items)) {
                $cleanItems = [];
                foreach ($items as $item) {
                    if (!\is_array($item)) {
                        continue;
                    }
                    unset($item['value']);
                    $cleanItems[] = $item;
                }
                $category['items'] = $cleanItems;
            }

            $cleaned[] = $category;
        }

        return $cleaned;
    }
}
