<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\BureauWeapon;
use App\Entity\User;
use App\Repository\BureauWeaponRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

#[Route('/api/bureau-weapons')]
final class BureauWeaponController
{
    private const ALLOWED_GRADES = ['Sheriff de comté', 'Sheriff Adjoint', 'Sheriff adjoint', 'Sheriff en chef'];

    public function __construct(
        private readonly BureauWeaponRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', name: 'api_bureau_weapons_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Accès réservé au Sheriff de comté, au Sheriff en chef et à l\'Adjoint.'],
                Response::HTTP_FORBIDDEN
            );
        }

        $rows = [];
        foreach ($this->repository->findBy([], ['updatedAt' => 'DESC']) as $w) {
            $rows[] = $this->serializeWeapon($w);
        }

        return new JsonResponse($rows);
    }

    #[Route('', name: 'api_bureau_weapons_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Seuls le Sheriff de comté, le Sheriff en chef et l\'Adjoint peuvent modifier le recensement.'],
                Response::HTTP_FORBIDDEN
            );
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $model = isset($body['model']) && \is_string($body['model']) ? trim($body['model']) : null;
        $serialNumber = isset($body['serialNumber']) && \is_string($body['serialNumber']) ? trim($body['serialNumber']) : null;
        $onLoan = isset($body['onLoan']) ? (bool) $body['onLoan'] : false;
        $inChest = isset($body['inChest']) ? (bool) $body['inChest'] : false;
        $hasScope = isset($body['hasScope']) ? (bool) $body['hasScope'] : false;
        $comments = isset($body['comments']) && \is_string($body['comments']) ? $body['comments'] : null;

        if ($model === null || $model === '' || $serialNumber === null || $serialNumber === '') {
            return new JsonResponse(
                ['error' => 'Champs requis : model (string), serialNumber (string).'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $weapon = new BureauWeapon($model, $serialNumber);
        $weapon->setOnLoan($onLoan);
        $weapon->setInChest($inChest);
        $weapon->setHasScope($hasScope);
        $weapon->setComments($comments);

        $this->entityManager->persist($weapon);
        $this->entityManager->flush();

        return new JsonResponse($this->serializeWeapon($weapon), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_bureau_weapons_patch', methods: ['PATCH'])]
    public function patch(string $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Seuls le Sheriff de comté, le Sheriff en chef et l\'Adjoint peuvent modifier le recensement.'],
                Response::HTTP_FORBIDDEN
            );
        }

        try {
            $uuid = Uuid::fromString($id);
        } catch (\Throwable) {
            return new JsonResponse(['error' => 'ID invalide'], Response::HTTP_BAD_REQUEST);
        }

        $weapon = $this->repository->find($uuid);
        if (!$weapon instanceof BureauWeapon) {
            return new JsonResponse(['error' => 'Introuvable'], Response::HTTP_NOT_FOUND);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        if (isset($body['model']) && \is_string($body['model'])) {
            $weapon->setModel(trim($body['model']));
        }
        if (isset($body['serialNumber']) && \is_string($body['serialNumber'])) {
            $weapon->setSerialNumber(trim($body['serialNumber']));
        }
        if (\array_key_exists('onLoan', $body)) {
            $weapon->setOnLoan((bool) $body['onLoan']);
        }
        if (\array_key_exists('inChest', $body)) {
            $weapon->setInChest((bool) $body['inChest']);
        }
        if (\array_key_exists('hasScope', $body)) {
            $weapon->setHasScope((bool) $body['hasScope']);
        }
        if (\array_key_exists('comments', $body)) {
            $weapon->setComments(\is_string($body['comments']) ? $body['comments'] : null);
        }

        $this->entityManager->flush();

        return new JsonResponse($this->serializeWeapon($weapon));
    }

    #[Route('/{id}', name: 'api_bureau_weapons_delete', methods: ['DELETE'])]
    public function delete(string $id, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Seuls le Sheriff de comté, le Sheriff en chef et l\'Adjoint peuvent modifier le recensement.'],
                Response::HTTP_FORBIDDEN
            );
        }

        try {
            $uuid = Uuid::fromString($id);
        } catch (\Throwable) {
            return new JsonResponse(['error' => 'ID invalide'], Response::HTTP_BAD_REQUEST);
        }

        $weapon = $this->repository->find($uuid);
        if (!$weapon instanceof BureauWeapon) {
            return new JsonResponse(['error' => 'Introuvable'], Response::HTTP_NOT_FOUND);
        }

        $this->entityManager->remove($weapon);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * @return array{id: string, model: string, serialNumber: string, onLoan: bool, inChest: bool, hasScope: bool, comments: string|null}
     */
    private function serializeWeapon(BureauWeapon $w): array
    {
        return [
            'id' => $w->getId()->toRfc4122(),
            'model' => $w->getModel(),
            'serialNumber' => $w->getSerialNumber(),
            'onLoan' => $w->isOnLoan(),
            'inChest' => $w->isInChest(),
            'hasScope' => $w->isHasScope(),
            'comments' => $w->getComments(),
        ];
    }
}

