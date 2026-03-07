# Pattern: Checkpoint/Resume Workflow

Persist progress of long-running workflows so they can resume from the last checkpoint after failure.

## When to Use

- Data migrations that process thousands of records
- ETL pipelines that take hours
- Any workflow where re-running from scratch is expensive
- Processes that may be interrupted (deployments, restarts)

## Core Interfaces

```typescript
interface Checkpoint {
  id: string
  workflowId: string
  stepIndex: number
  data: unknown
  createdAt: Date
  expiresAt: Date
}

interface WorkflowStep<TData> {
  name: string
  execute: (data: TData) => Promise<TData>
}

interface WorkflowResult<TData> {
  success: boolean
  data: TData
  completedSteps: number
  resumedFromCheckpoint: boolean
}

interface CheckpointStorage {
  save(checkpoint: Checkpoint): Promise<void>
  get(workflowId: string): Promise<Checkpoint | null>
  delete(workflowId: string): Promise<void>
}
```

## ResumableWorkflow Implementation

```typescript
class ResumableWorkflow<TData extends Record<string, unknown>> {
  private steps: WorkflowStep<TData>[] = []
  private checkpointTTL = 24 * 60 * 60 * 1000 // 24 hours

  constructor(
    private workflowId: string,
    private storage: CheckpointStorage
  ) {}

  addStep(step: WorkflowStep<TData>): this {
    this.steps.push(step)
    return this
  }

  async execute(initialData: TData): Promise<WorkflowResult<TData>> {
    // Check for existing checkpoint
    const checkpoint = await this.storage.get(this.workflowId)
    let startIndex = 0
    let data = initialData
    let resumedFromCheckpoint = false

    if (checkpoint && checkpoint.expiresAt > new Date()) {
      console.log(`[Workflow] Resuming from checkpoint at step ${checkpoint.stepIndex}`)
      startIndex = checkpoint.stepIndex
      data = checkpoint.data as TData
      resumedFromCheckpoint = true
    }

    try {
      for (let i = startIndex; i < this.steps.length; i++) {
        const step = this.steps[i]
        console.log(`[Workflow] Executing step ${i + 1}/${this.steps.length}: ${step.name}`)

        data = await step.execute(data)

        // Save checkpoint after each step
        await this.saveCheckpoint(i + 1, data)
      }

      // Workflow complete - clean up checkpoint
      await this.storage.delete(this.workflowId)

      return {
        success: true,
        data,
        completedSteps: this.steps.length,
        resumedFromCheckpoint
      }
    } catch (error) {
      console.error(`[Workflow] Failed at step ${startIndex + 1}:`, error)
      throw error
    }
  }

  private async saveCheckpoint(stepIndex: number, data: TData): Promise<void> {
    const checkpoint: Checkpoint = {
      id: crypto.randomUUID(),
      workflowId: this.workflowId,
      stepIndex,
      data,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.checkpointTTL)
    }
    await this.storage.save(checkpoint)
  }
}
```

## DatabaseCheckpointStorage

```typescript
class DatabaseCheckpointStorage implements CheckpointStorage {
  async save(checkpoint: Checkpoint): Promise<void> {
    await db.insert(checkpoints)
      .values(checkpoint)
      .onConflictDoUpdate({
        target: checkpoints.workflowId,
        set: {
          stepIndex: checkpoint.stepIndex,
          data: checkpoint.data,
          expiresAt: checkpoint.expiresAt
        }
      })
  }

  async get(workflowId: string): Promise<Checkpoint | null> {
    const result = await db.select()
      .from(checkpoints)
      .where(eq(checkpoints.workflowId, workflowId))
      .limit(1)
    return result[0] || null
  }

  async delete(workflowId: string): Promise<void> {
    await db.delete(checkpoints)
      .where(eq(checkpoints.workflowId, workflowId))
  }
}
```

## Key Points

- Checkpoints are saved **after** each successful step
- On resume, workflow skips already-completed steps
- Expired checkpoints are ignored (workflow restarts from beginning)
- Completed workflows clean up their checkpoints
- Storage is pluggable (database, Redis, file system)
- Each step receives and returns the accumulated data
