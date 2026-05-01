<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Serializer\Attribute\SerializedName;

/**
 * PUT /api/reference JSON body. All weapon/catalog keys are optional partial updates (see CountyReference::setData).
 */
final class CountyReferencePutDto
{
    public function __construct(
        /** @var list<mixed>|null */
        public ?array $fusil = null,
        /** @var list<mixed>|null */
        public ?array $carabine = null,
        /** @var list<mixed>|null */
        public ?array $fusilAPompe = null,
        /** @var list<mixed>|null */
        public ?array $revolver = null,
        /** @var list<mixed>|null */
        public ?array $pistolet = null,
        /** @var list<mixed>|null */
        public ?array $armeBlanche = null,
        /** @var list<array<string, mixed>>|null */
        public ?array $itemCategories = null,
        /** @var list<array<string, mixed>>|null */
        public ?array $contraventions = null,
        /** @var list<array<string, mixed>>|null */
        public ?array $homeInfoCategories = null,
        /** @var list<array<string, mixed>>|null */
        public ?array $formations = null,
        /** @var list<array<string, mixed>>|null */
        public ?array $formationsByGrade = null,
        #[SerializedName('__version')]
        public ?int $expectedVersion = null,
    ) {
    }

    /**
     * Payload for CountyReference::setData (excludes lock token).
     *
     * @return array<string, mixed>
     */
    public function toSetDataArray(): array
    {
        return array_filter(
            [
                'fusil' => $this->fusil,
                'carabine' => $this->carabine,
                'fusilAPompe' => $this->fusilAPompe,
                'revolver' => $this->revolver,
                'pistolet' => $this->pistolet,
                'armeBlanche' => $this->armeBlanche,
                'itemCategories' => $this->itemCategories,
                'contraventions' => $this->contraventions,
                'homeInfoCategories' => $this->homeInfoCategories,
                'formations' => $this->formations,
                'formationsByGrade' => $this->formationsByGrade,
            ],
            static fn ($v): bool => null !== $v,
        );
    }
}
