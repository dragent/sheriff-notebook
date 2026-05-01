<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\SeizureRecord;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

/**
 * POST /api/destructions payload (MapRequestPayload + Validator).
 */
final class DestructionRecordCreateDto
{
    /**
     * @var list<DestructionRecordLineDto>
     */
    #[Assert\Count(min: 1, minMessage: 'Au moins une ligne est requise.')]
    #[Assert\Valid]
    public array $lines = [];

    #[Assert\Callback]
    public function validateLineRules(ExecutionContextInterface $context): void
    {
        if ([] === $this->lines) {
            return;
        }

        $referenceDate = null;
        $today = new \DateTimeImmutable('today');
        foreach ($this->lines as $i => $line) {
            $path = \sprintf('lines[%d]', $i);

            if ('' === $line->destruction) {
                continue;
            }
            if ($line->qte < 1) {
                continue;
            }

            if (SeizureRecord::DESTRUCTION_LINE_KEY_CASH === $line->destruction && ($line->qte % 100) !== 0) {
                $context->buildViolation('Les dollares doivent être détruits par tranches de 100 $.')
                    ->atPath($path.'.qte')
                    ->addViolation();
            }

            if (null === $referenceDate) {
                if ('' === $line->date) {
                    $context->buildViolation('La date de destruction est requise.')
                        ->atPath($path.'.date')
                        ->addViolation();
                    continue;
                }
                $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $line->date);
                if (!$dt || $dt->format('Y-m-d') !== $line->date) {
                    $context->buildViolation('Format de date invalide. Utiliser AAAA-MM-JJ.')
                        ->atPath($path.'.date')
                        ->addViolation();
                    continue;
                }
                if ($dt < $today) {
                    $context->buildViolation('La date de destruction ne peut pas être dans le passé.')
                        ->atPath($path.'.date')
                        ->addViolation();
                    continue;
                }
                $referenceDate = $line->date;
            } elseif ('' !== $line->date && $line->date !== $referenceDate) {
                $context->buildViolation('Toutes les lignes partagent la même date de destruction (celle de la première ligne).')
                    ->atPath($path.'.date')
                    ->addViolation();
            }
        }
    }

    /**
     * @return list<array{date: string, qte: int, sommes: string, destruction: string}>
     */
    public function toNormalizedLines(): array
    {
        $referenceDate = null;
        $out = [];
        foreach ($this->lines as $line) {
            if (null === $referenceDate) {
                $referenceDate = $line->date;
            }
            $out[] = [
                'date' => $referenceDate,
                'qte' => $line->qte,
                'sommes' => $line->sommes,
                'destruction' => $line->destruction,
            ];
        }

        return $out;
    }
}
