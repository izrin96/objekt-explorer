import { Entity, Column, PrimaryColumn, Index } from "typeorm";

@Entity()
export class TransferabilityUpdate {
  constructor(props?: Partial<TransferabilityUpdate>) {
    Object.assign(this, props);
  }

  // for some reason subsquid tries to cast this to ::text, so uuid won't work
  @PrimaryColumn({
    type: "varchar",
    length: 36,
  })
  id!: string;

  @Index()
  @Column("text", { nullable: false })
  tokenId!: string;

  @Column("bool", { nullable: false })
  transferable!: boolean;

  @Index()
  @Column("int4", { nullable: false })
  blockNumber!: number;

  @Column("int4", { nullable: false })
  transactionIndex!: number;

  @Column("text", { nullable: false })
  hash!: string;

  @Index()
  @Column("timestamp with time zone", { nullable: true })
  appliedAt!: Date | null;
}
