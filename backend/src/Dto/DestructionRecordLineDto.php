<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Single destruction line in POST /api/destructions.
 * Only the first line must carry the shared destruction date; following lines may omit `date` (it is normalized server-side).
 */
final class DestructionRecordLineDto
{
    #[Assert\Length(max: 16, maxMessage: 'La date ne doit pas dépasser {{ limit }} caractères.')]
    public string $date = '';

    #[Assert\Positive(message: 'Chaque ligne doit avoir une quantité strictement positive.')]
    public int $qte = 0;

    #[Assert\Length(max: 64, maxMessage: 'Le champ "sommes" ne doit pas dépasser {{ limit }} caractères.')]
    public string $sommes = '';

    #[Assert\NotBlank(message: 'Chaque ligne doit avoir un type de destruction choisi.')]
    #[Assert\Length(max: 255, maxMessage: 'Le type de destruction ne doit pas dépasser {{ limit }} caractères.')]
    public string $destruction = '';
}
