<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Repository\CountyReferenceRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Informations affichées sur la page d'accueil (lecture seule, pas d'auth).
 */
#[Route('/api/home-info')]
final class HomeInfoController
{
    public function __construct(
        private readonly CountyReferenceRepository $repository,
    ) {
    }

    #[Route('', name: 'api_home_info_get', methods: ['GET'])]
    public function get(): JsonResponse
    {
        $ref = $this->repository->getSingleton();
        $data = $ref->getData();
        $categories = $data['homeInfoCategories'] ?? [];

        return new JsonResponse([
            'homeInfoCategories' => $categories,
        ]);
    }
}
