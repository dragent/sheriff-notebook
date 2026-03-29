<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\BureauInventory;
use App\Repository\BureauInventoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use App\Entity\User;

#[Route('/api/coffres')]
final class BureauInventoryController
{
    private const ALLOWED_GRADES = ['Sheriff de comté', 'Sheriff Adjoint', 'Sheriff adjoint', 'Sheriff en chef'];

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
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Accès réservé au Sheriff de comté, au Sheriff en chef et à l\'Adjoint.'],
                403
            );
        }

        $byKey = [];
        foreach ($this->repository->findAllOrderedByCategoryAndName() as $item) {
            $byKey[$item->getCategory() . '|' . $item->getName()] = $item->getQuantity();
        }

        $inventaire = [];
        foreach (self::TYPES_MUNITION as $type) {
            $inventaire[] = [
                'type' => $type,
                'quantite' => $byKey[self::CATEGORY_MUNITIONS . '|' . $type] ?? 0,
            ];
        }

        $accessoiresBureau = [];
        foreach (self::TYPES_ACCESSOIRES_BUREAU as $type) {
            $accessoiresBureau[] = [
                'type' => $type,
                'bureau' => $byKey[self::CATEGORY_ACCESSOIRES . '|' . $type] ?? 0,
            ];
        }

        return new JsonResponse([
            'inventaire' => $inventaire,
            'accessoiresBureau' => $accessoiresBureau,
        ]);
    }

    #[Route('', name: 'api_coffres_patch', methods: ['PATCH'])]
    public function patch(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Seuls le Sheriff de comté, le Sheriff en chef et l\'Adjoint peuvent modifier l\'inventaire.'],
                403
            );
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $section = isset($body['section']) && \in_array($body['section'], ['inventaire', 'accessoiresBureau'], true)
            ? $body['section']
            : null;
        $type = isset($body['type']) && \is_string($body['type']) ? trim($body['type']) : null;
        $quantity = isset($body['quantity']) && is_numeric($body['quantity'])
            ? (int) $body['quantity']
            : null;

        if ($section === null || $type === '' || $quantity === null || $quantity < 0) {
            return new JsonResponse(
                ['error' => 'Champs requis : section (inventaire|accessoiresBureau), type (string), quantity (entier >= 0).'],
                400
            );
        }

        $category = $section === 'inventaire' ? self::CATEGORY_MUNITIONS : self::CATEGORY_ACCESSOIRES;
        $allowedTypes = $section === 'inventaire' ? self::TYPES_MUNITION : self::TYPES_ACCESSOIRES_BUREAU;
        if (!\in_array($type, $allowedTypes, true)) {
            return new JsonResponse(['error' => 'Type inconnu pour cette section.'], 400);
        }

        $item = $this->repository->findOneByCategoryAndName($category, $type);
        if ($item === null) {
            $item = new BureauInventory($category, $type);
            $this->entityManager->persist($item);
        }
        $item->setQuantity($quantity);
        $this->entityManager->flush();

        $key = $section === 'inventaire' ? 'quantite' : 'bureau';
        return new JsonResponse([
            'type' => $type,
            $key => $quantity,
        ]);
    }
}
