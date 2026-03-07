// Data Migration Workflow with Checkpoints
// Demonstrates resumable long-running process

interface MigrationData {
  sourceRecords?: unknown[];
  transformedRecords?: unknown[];
  importedCount?: number;
  errors?: string[];
}

// Assumes ResumableWorkflow and DatabaseCheckpointStorage from references/pattern-checkpoint.md

const migrationWorkflow = new ResumableWorkflow<MigrationData>(
  "migration-2024-01",
  new DatabaseCheckpointStorage(),
)
  .addStep({
    name: "Extract Source Data",
    execute: async (data) => {
      const records = await sourceDb.selectAll();
      return { ...data, sourceRecords: records };
    },
  })
  .addStep({
    name: "Transform Records",
    execute: async (data) => {
      const transformed = data.sourceRecords!.map(transformRecord);
      return { ...data, transformedRecords: transformed };
    },
  })
  .addStep({
    name: "Load to Target",
    execute: async (data) => {
      let count = 0;
      const errors: string[] = [];

      for (const record of data.transformedRecords!) {
        try {
          await targetDb.insert(record);
          count++;
        } catch (error) {
          errors.push(
            `Record ${(record as { id: string }).id}: ${(error as Error).message}`,
          );
        }
      }

      return { ...data, importedCount: count, errors };
    },
  });

// Execute (will resume from checkpoint if one exists)
const result = await migrationWorkflow.execute({});

if (result.success) {
  console.log(`Migration complete. Imported: ${result.data.importedCount}`);
  console.log(`Resumed from checkpoint: ${result.resumedFromCheckpoint}`);
  if (result.data.errors?.length) {
    console.warn(`Errors: ${result.data.errors.length}`);
    result.data.errors.forEach((e) => console.warn(`  - ${e}`));
  }
}
