<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\ComptaEntryCreateDto;
use App\Entity\ComptaEntry;
use App\Entity\User;
use App\Repository\ComptaEntryRepository;
use App\Security\Voter\ComptaEntryVoter;
use App\Util\ComptaAmountParser;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/comptabilite')]
final class ComptaEntryController
{
    public function __construct(
        private readonly ComptaEntryRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('', name: 'api_comptabilite_list', methods: ['GET'])]
    #[IsGranted(ComptaEntryVoter::MANAGE)]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        $entries = $this->repository->findAllOrderedByDateDesc();
        $entrees = [];
        $sorties = [];

        foreach ($entries as $e) {
            $somme = ComptaAmountParser::parseToFloat($e->getAmount());
            $row = [
                'id' => $e->getId()->toRfc4122(),
                'dateIso' => $e->getDate(),
                'sheriff' => $e->getSheriff(),
                'raison' => $e->getReason(),
                'somme' => $somme,
            ];
            if ($e->getType() === ComptaEntry::TYPE_ENTREE) {
                $entrees[] = $row;
            } else {
                $sorties[] = $row;
            }
        }

        return new JsonResponse([
            'entrees' => $entrees,
            'sorties' => $sorties,
        ]);
    }

    #[Route('', name: 'api_comptabilite_create', methods: ['POST'])]
    #[IsGranted(ComptaEntryVoter::MANAGE)]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], Response::HTTP_BAD_REQUEST);
        }

        $dto = ComptaEntryCreateDto::fromArray($body);
        $violations = $this->validator->validate($dto);

        if ($violations->count() > 0) {
            $first = $violations->get(0);

            return new JsonResponse([
                'error' => $first->getMessage(),
                'field' => $first->getPropertyPath(),
            ], Response::HTTP_BAD_REQUEST);
        }

        // Business rule: reject withdrawals that would make balance negative.
        if ($dto->type === ComptaEntry::TYPE_SORTIE) {
            $soldeCourant = $this->repository->getCurrentSolde();
            $nouveauSolde = $soldeCourant - $dto->somme;

            if ($nouveauSolde < 0) {
                return new JsonResponse([
                    'error' => 'Opération refusée : le solde ne peut pas devenir négatif.',
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        $entry = new ComptaEntry(
            $dto->type,
            $dto->dateIso,
            $dto->sheriff,
            $dto->raison,
            $dto->getAmountFormatted(),
        );
        $this->entityManager->persist($entry);
        $this->entityManager->flush();

        return new JsonResponse([
            'id' => $entry->getId()->toRfc4122(),
            'type' => $entry->getType(),
            'dateIso' => $entry->getDate(),
            'sheriff' => $entry->getSheriff(),
            'raison' => $entry->getReason(),
            'somme' => ComptaAmountParser::parseToFloat($entry->getAmount()),
        ], Response::HTTP_CREATED);
    }
}
