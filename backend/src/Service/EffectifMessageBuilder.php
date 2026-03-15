<?php

declare(strict_types=1);

namespace App\Service;

final class EffectifMessageBuilder
{
    public const MAX_EFFECTIF = 15;

    private const GRADE_HEADERS = [
        'Sheriff de comté' => ":star: - SHERIFF DE COMTÉ",
        'Sheriff Adjoint' => ":star2: - SHERIFF ADJOINT",
        'Sheriff en chef' => ":star2: - SHERIFF EN CHEF",
        'Sheriff' => ":dizzy: - SHERIFF",
        'Sheriff Deputy' => ":stars: - SHERIFF DEPUTY",
        'Deputy' => ":passport_control: - DEPUTY",
    ];

    public function build(array $sheriffs, \DateTimeInterface $date): string
    {
        $byGrade = [];
        foreach ($sheriffs as $s) {
            $grade = $s['grade'];
            if (!isset($byGrade[$grade])) {
                $byGrade[$grade] = [];
            }
            $byGrade[$grade][] = [
                'username' => $s['username'],
                'badge' => isset($s['badge']) && $s['badge'] !== '' ? trim((string) $s['badge']) : null,
                'telegram' => isset($s['telegram']) && $s['telegram'] !== '' ? trim((string) $s['telegram']) : null,
            ];
        }

        $lines = [];
        $lines[] = "# :clipboard: Registre du personnel — Bureau du Shérif d'Annesburg";
        $lines[] = '';

        foreach (self::GRADE_HEADERS as $gradeKey => $header) {
            $lines[] = '### ' . $header;
            $members = $byGrade[$gradeKey] ?? [];
            if ($members === []) {
                $lines[] = '- ';
                $lines[] = '';
            } else {
                foreach ($members as $m) {
                    $line = '- ' . $m['username'];
                    if ($m['telegram'] !== null) {
                        $line .= ' — ' . $m['telegram'];
                    }
                    if ($m['badge'] !== null) {
                        $line .= ' :identification_card: ' . $m['badge'];
                    }
                    $lines[] = $line;
                }
                $lines[] = '';
            }
        }

        $effectif = \count($sheriffs);
        $lines[] = '**Effectif actuel** : ' . $effectif . ' / ' . self::MAX_EFFECTIF . ' postes';

        // Fallback to d/m/Y when intl extension is not available (e.g. minimal Docker image).
        if (\class_exists(\IntlDateFormatter::class)) {
            $formatter = new \IntlDateFormatter('fr_FR', \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, null, null, 'd MMMM');
            $dateFr = $formatter->format($date) ?: $date->format('d/m/Y');
        } else {
            $dateFr = $date->format('d/m/Y');
        }
        $lines[] = '**Dernière révision du registre** : ' . $dateFr;

        return implode("\n", $lines);
    }
}
