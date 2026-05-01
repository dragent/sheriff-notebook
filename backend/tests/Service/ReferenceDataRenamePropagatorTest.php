<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\BureauWeapon;
use App\Entity\ComptaEntry;
use App\Entity\DestructionRecord;
use App\Entity\SeizureRecord;
use App\Entity\ServiceRecord;
use App\Service\ReferenceDataRenamePropagator;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Integration tests for the rename propagator: each test starts from an empty SQLite schema,
 * persists a small fixture, then asserts that propagate(before, after) updates the right rows.
 */
final class ReferenceDataRenamePropagatorTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private ReferenceDataRenamePropagator $propagator;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->propagator = self::getContainer()->get(ReferenceDataRenamePropagator::class);

        // Ensure a clean schema for each test.
        $tool = new SchemaTool($this->em);
        $metas = $this->em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($metas);
        $tool->createSchema($metas);
    }

    public function testEmptyChangeProducesEmptyCounts(): void
    {
        $result = $this->propagator->propagate([], []);

        self::assertSame([
            'seizures' => 0,
            'seizureNotes' => 0,
            'destructions' => 0,
            'bureauWeapons' => 0,
            'serviceRecords' => 0,
            'serviceRecordCartBoat' => 0,
            'comptaEntries' => 0,
            'formationValidationRecords' => 0,
        ], $result);
    }

    public function testWeaponSingletonRenameUpdatesSeizureWeaponModel(): void
    {
        $seizure = new SeizureRecord(
            type: SeizureRecord::TYPE_WEAPON,
            date: '2026-04-15',
            sheriff: 'McLane',
            quantity: 1,
            weaponModel: 'Carabine 1873',
        );
        $this->em->persist($seizure);
        $this->em->flush();

        $before = ['carabine' => [['name' => 'Carabine 1873']]];
        $after = ['carabine' => [['name' => 'Carabine 1876']]];

        $result = $this->propagator->propagate($before, $after);
        // Propagator only mutates managed entities; the production call site (CountyReferenceController) flushes.
        $this->em->flush();
        $this->em->refresh($seizure);

        self::assertSame(1, $result['seizures']);
        self::assertSame('Carabine 1876', $seizure->getWeaponModel());
    }

    public function testItemRenameUpdatesSeizureItemName(): void
    {
        $seizure = new SeizureRecord(
            type: SeizureRecord::TYPE_ITEM,
            date: '2026-04-15',
            sheriff: 'McLane',
            quantity: 5,
            itemName: 'Whisky',
        );
        $this->em->persist($seizure);
        $this->em->flush();

        $before = ['itemCategories' => [['id' => 'alcool', 'name' => 'Alcool', 'items' => [['name' => 'Whisky']]]]];
        $after = ['itemCategories' => [['id' => 'alcool', 'name' => 'Alcool', 'items' => [['name' => 'Bourbon']]]]];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($seizure);

        self::assertSame(1, $result['seizures']);
        self::assertSame('Bourbon', $seizure->getItemName());
    }

    public function testBureauWeaponModelIsRenamed(): void
    {
        $weapon = new BureauWeapon('Evans', 'EV-001');
        $this->em->persist($weapon);
        $this->em->flush();

        $before = ['fusil' => [['name' => 'Evans']]];
        $after = ['fusil' => [['name' => 'Evans Repeater']]];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($weapon);

        self::assertSame(1, $result['bureauWeapons']);
        self::assertSame('Evans Repeater', $weapon->getModel());
    }

    public function testContraventionRenameUpdatesComptaReason(): void
    {
        $entry = new ComptaEntry(
            type: ComptaEntry::TYPE_ENTREE,
            date: '2026-04-15',
            sheriff: 'McLane',
            reason: 'Trouble à l\'ordre public',
            amount: '50.00',
        );
        $this->em->persist($entry);
        $this->em->flush();

        $before = [
            'contraventions' => [
                ['label' => 'Trouble à l\'ordre public', 'amende' => '50', 'prisonTime' => '0'],
            ],
        ];
        $after = [
            'contraventions' => [
                ['label' => 'Trouble à l\'ordre public — léger', 'amende' => '50', 'prisonTime' => '0'],
            ],
        ];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($entry);

        self::assertSame(1, $result['comptaEntries']);
        self::assertSame('Trouble à l\'ordre public — léger', $entry->getReason());
    }

    public function testDestructionLineRenameIsPropagated(): void
    {
        $record = new DestructionRecord(
            [
                ['date' => '2026-04-15', 'qte' => 3, 'sommes' => '', 'destruction' => 'Whisky'],
            ],
            'McLane',
        );
        $this->em->persist($record);
        $this->em->flush();

        $before = ['itemCategories' => [['id' => 'alc', 'name' => 'Alcool', 'items' => [['name' => 'Whisky']]]]];
        $after = ['itemCategories' => [['id' => 'alc', 'name' => 'Alcool', 'items' => [['name' => 'Bourbon']]]]];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($record);

        self::assertSame(1, $result['destructions']);
        $line = $record->getLines()[0];
        self::assertSame('Bourbon', $line['destruction']);
    }

    public function testFormationIdRemapWhenLabelStaysButIdChanges(): void
    {
        $sr = new ServiceRecord('Deputy McLane');
        $sr->setFormationValidations(['old-uuid' => true]);
        $this->em->persist($sr);
        $this->em->flush();

        $before = ['formations' => [['id' => 'old-uuid', 'label' => 'Maniement du fusil']]];
        $after = ['formations' => [['id' => 'new-uuid', 'label' => 'Maniement du fusil']]];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($sr);

        self::assertSame(1, $result['formationValidationRecords']);
        self::assertSame(['new-uuid' => true], $sr->getFormationValidations());
    }

    public function testCartInfoRenamePreservesLayout(): void
    {
        $sr = new ServiceRecord('Sheriff McLane');
        $sr->setCartInfo("Whisky\nFoin\nBalle Ordinaire");
        $this->em->persist($sr);
        $this->em->flush();

        $before = ['itemCategories' => [['id' => 'alc', 'name' => 'Alcool', 'items' => [['name' => 'Whisky']]]]];
        $after = ['itemCategories' => [['id' => 'alc', 'name' => 'Alcool', 'items' => [['name' => 'Bourbon']]]]];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($sr);

        self::assertSame(1, $result['serviceRecordCartBoat']);
        self::assertSame("Bourbon\nFoin\nBalle Ordinaire", $sr->getCartInfo());
    }

    public function testAmbiguousMultiRenameIsSkipped(): void
    {
        // Two simultaneous renames cannot be inferred unambiguously → propagator must do nothing.
        $weapon = new BureauWeapon('Evans', 'EV-001');
        $this->em->persist($weapon);
        $this->em->flush();

        $before = ['fusil' => [['name' => 'Evans'], ['name' => 'Henry']]];
        $after = ['fusil' => [['name' => 'Carcano'], ['name' => 'Mauser']]];

        $result = $this->propagator->propagate($before, $after);
        $this->em->flush();
        $this->em->refresh($weapon);

        self::assertSame(0, $result['bureauWeapons']);
        self::assertSame('Evans', $weapon->getModel());
    }

    public function testNoChangeProducesNoUpdate(): void
    {
        $weapon = new BureauWeapon('Evans', 'EV-001');
        $this->em->persist($weapon);
        $this->em->flush();

        $payload = ['fusil' => [['name' => 'Evans']]];
        $result = $this->propagator->propagate($payload, $payload);
        $this->em->flush();
        $this->em->refresh($weapon);

        self::assertSame(0, $result['bureauWeapons']);
        self::assertSame('Evans', $weapon->getModel());
    }
}
