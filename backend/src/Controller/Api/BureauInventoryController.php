<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\BureauInventoryPatchDto;
use App\Entity\BureauInventory;
use App\Repository\BureauInventoryRepository;
use App\Security\Voter\BureauVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/coffres')]
#[IsGranted(BureauVoter::MANAGE, message: 'Accès réservé au Sheriff de comté, au Sheriff en chef et à l\'Adjoint.')]
final class BureauInventoryController
{
    private const CATEGORY_MUNITIONS = 'Munitions';
    private const CATEGORY_ACCESSOIRES = 'Accessoires du bureau';

    /** Types munitions (ordre affiché dans l’UI). */
    private const TYPES_MUNITION = [
        'Munition de revolver',
        'Munition de pistolet',
        'Chevrotine',
        'Munition Carabine',
        'Munition de fusil',
        'Munition tranquillisante',
    ];

    /** Types accessoires bureau (ordre affiché dans l’UI). */
    private const TYPES_ACCESSOIRES_BUREAU = [
        'Étoile de sheriff',
        'Plat',
        'Boisson',
        'Appareil photo',
        'Jumelle',
        'Menotte',
        'Fumigène Rouge',
        'Fumigène Bleu',
        'Fumigène Blanc',
        'Fumigène Cyan',
        'Fumigène Noir',
        'Fumigène Rose',
        'Fumigène Vert',
        'Fumigène Jaune',
    ];

    public function __construct(
        private readonly BureauInventoryRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', name: 'api_coffres_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $byKey = [];
        foreach ($this->repository->findAllOrderedByCategoryAndName() as $item) {
            $byKey[$item->getCategory().'|'.$item->getName()] = $item->getQuantity();
        }

        $inventaire = [];
        foreach (self::TYPES_MUNITION as $type) {
            $inventaire[] = [
                'type' => $type,
                'quantite' => $byKey[self::CATEGORY_MUNITIONS.'|'.$type] ?? 0,
            ];
        }

        $accessoiresBureau = [];
        foreach (self::TYPES_ACCESSOIRES_BUREAU as $type) {
            $accessoiresBureau[] = [
                'type' => $type,
                'bureau' => $byKey[self::CATEGORY_ACCESSOIRES.'|'.$type] ?? 0,
            ];
        }

        return new JsonResponse([
            'inventaire' => $inventaire,
            'accessoiresBureau' => $accessoiresBureau,
        ]);
    }

    #[Route('', name: 'api_coffres_patch', methods: ['PATCH'])]
    public function patch(
        #[MapRequestPayload(validationFailedStatusCode: \Symfony\Component\HttpFoundation\Response::HTTP_BAD_REQUEST)]
        BureauInventoryPatchDto $payload,
    ): JsonResponse {
        $section = $payload->section;
        $type = trim($payload->type);
        $category = 'inventaire' === $section ? self::CATEGORY_MUNITIONS : self::CATEGORY_ACCESSOIRES;
        $allowedTypes = 'inventaire' === $section ? self::TYPES_MUNITION : self::TYPES_ACCESSOIRES_BUREAU;
        if (!\in_array($type, $allowedTypes, true)) {
            return new JsonResponse(['error' => 'Type inconnu pour cette section.'], 400);
        }

        $item = $this->repository->findOneByCategoryAndName($category, $type);
        if (null === $item) {
            $item = new BureauInventory($category, $type);
            $this->entityManager->persist($item);
        }
        $item->setQuantity($payload->quantity);
        $this->entityManager->flush();

        $key = 'inventaire' === $section ? 'quantite' : 'bureau';

        return new JsonResponse([
            'type' => $type,
            $key => $payload->quantity,
        ]);
    }
}
