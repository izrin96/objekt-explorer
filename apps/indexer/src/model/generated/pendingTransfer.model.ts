import { Entity, Column, PrimaryColumn, Index } from "typeorm";

@Entity()
export class PendingTransfer {
  constructor(props?: Partial<PendingTransfer>) {
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

  @Column("text", { nullable: false })
  from!: string;

  @Column("text", { nullable: false })
  to!: string;

  @Column("timestamp with time zone", { nullable: false })
  timestamp!: Date;

  @Column("text", { nullable: false })
  hash!: string;

  @Column("int4", { nullable: false })
  blockNumber!: number;

  @Column("int4", { nullable: false })
  logIndex!: number;
}
