import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// Dates are stored as "YYYY-MM-DD" text; timestamps as ISO strings.
// Money is stored as whole rupees (integers). GST is split only on receipts.

export const centres = sqliteTable("centres", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
});

export const batches = sqliteTable("batches", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull().references(() => centres.id),
  name: text("name").notNull(),
  course: text("course", { enum: ["JEE", "NEET"] }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

export const parents = sqliteTable(
  "parents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // E.164 without +, e.g. 919829000587
    language: text("language", { enum: ["en", "hi"] }).notNull().default("hi"),
    consentAt: text("consent_at"),
    consentVersion: text("consent_version"),
  },
  (t) => [uniqueIndex("parents_phone").on(t.phone)],
);

export const students = sqliteTable(
  "students",
  {
    id: text("id").primaryKey(), // STU-0412
    name: text("name").notNull(),
    batchId: text("batch_id").notNull().references(() => batches.id),
    parentId: text("parent_id").notNull().references(() => parents.id),
    enrolledOn: text("enrolled_on").notNull(),
    status: text("status", { enum: ["active", "withdrawn"] }).notNull().default("active"),
    withdrawnOn: text("withdrawn_on"),
  },
  (t) => [index("students_batch").on(t.batchId), index("students_parent").on(t.parentId)],
);

export const feePlans = sqliteTable("fee_plans", {
  studentId: text("student_id").primaryKey().references(() => students.id),
  grossFee: integer("gross_fee").notNull(),
  discountType: text("discount_type", { enum: ["none", "percent", "flat"] }).notNull(),
  discountValue: integer("discount_value").notNull().default(0),
  discountReason: text("discount_reason"),
  netFee: integer("net_fee").notNull(),
});

export const instalments = sqliteTable(
  "instalments",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull().references(() => students.id),
    seq: integer("seq").notNull(),
    dueDate: text("due_date").notNull(),
    amount: integer("amount").notNull(),
  },
  (t) => [uniqueIndex("instalments_student_seq").on(t.studentId, t.seq)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull().references(() => students.id),
    amount: integer("amount").notNull(),
    receivedOn: text("received_on").notNull(),
    method: text("method", { enum: ["gateway", "neft", "upi", "cash", "cheque"] }).notNull(),
    reference: text("reference").notNull(),
    receiptNo: text("receipt_no").notNull(),
    gatewayOrderId: text("gateway_order_id"),
    recordedBy: text("recorded_by").notNull(), // "system:gateway", "system:matcher", staff id
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("payments_student").on(t.studentId),
    uniqueIndex("payments_receipt").on(t.receiptNo),
    uniqueIndex("payments_gateway_order").on(t.gatewayOrderId),
  ],
);

export const gatewayOrders = sqliteTable("gateway_orders", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id),
  instalmentId: text("instalment_id").notNull().references(() => instalments.id),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["created", "paid", "failed"] }).notNull(),
  createdAt: text("created_at").notNull(),
});

/** Money that arrived but could not be tied to a student with certainty. */
export const unmatchedPayments = sqliteTable("unmatched_payments", {
  id: text("id").primaryKey(),
  amount: integer("amount").notNull(),
  reference: text("reference").notNull(),
  payerName: text("payer_name").notNull(),
  receivedOn: text("received_on").notNull(),
  source: text("source", { enum: ["neft", "upi", "gateway"] }).notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["open", "matched", "returned"] }).notNull().default("open"),
  matchedPaymentId: text("matched_payment_id"),
  resolvedBy: text("resolved_by"),
  resolvedAt: text("resolved_at"),
});

export const reminders = sqliteTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull().references(() => students.id),
    instalmentId: text("instalment_id").notNull().references(() => instalments.id),
    offsetDays: integer("offset_days").notNull(),
    status: text("status", { enum: ["sent", "superseded"] }).notNull(),
    channel: text("channel", { enum: ["whatsapp", "sms"] }).notNull(),
    language: text("language", { enum: ["en", "hi"] }).notNull(),
    toPhone: text("to_phone").notNull(),
    body: text("body").notNull(),
    balanceAtSend: integer("balance_at_send").notNull(),
    sentOn: text("sent_on").notNull(),
  },
  (t) => [uniqueIndex("reminders_once").on(t.instalmentId, t.offsetDays), index("reminders_student").on(t.studentId)],
);

export const attendance = sqliteTable(
  "attendance",
  {
    studentId: text("student_id").notNull().references(() => students.id),
    month: text("month").notNull(), // YYYY-MM
    present: integer("present").notNull(),
    total: integer("total").notNull(),
  },
  (t) => [uniqueIndex("attendance_pk").on(t.studentId, t.month)],
);

export const testScores = sqliteTable(
  "test_scores",
  {
    studentId: text("student_id").notNull().references(() => students.id),
    testName: text("test_name").notNull(),
    testDate: text("test_date").notNull(),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
  },
  (t) => [uniqueIndex("test_scores_pk").on(t.studentId, t.testName)],
);

/** Dropout-risk flags. A flag only ever creates a counsellor call task. */
export const riskFlags = sqliteTable(
  "risk_flags",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull().references(() => students.id),
    probability: integer("probability").notNull(), // 0-100
    factors: text("factors").notNull(), // JSON
    createdOn: text("created_on").notNull(),
    status: text("status", { enum: ["open", "called", "false_flag"] }).notNull().default("open"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
  },
  (t) => [index("risk_student").on(t.studentId)],
);

export const refunds = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id),
  requestDate: text("request_date").notNull(),
  leaveDate: text("leave_date").notNull(),
  materialDeduction: integer("material_deduction").notNull().default(0),
  refundAmount: integer("refund_amount").notNull(),
  calculation: text("calculation").notNull(), // JSON snapshot of the result
  policyVersion: text("policy_version").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status", { enum: ["pending_approval", "approved", "paid"] }).notNull(),
  createdBy: text("created_by").notNull(),
  approvedBy: text("approved_by"),
  paidOn: text("paid_on"),
  payoutReference: text("payout_reference"),
});

export const staff = sqliteTable(
  "staff",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["accounts", "counsellor"] }).notNull(),
  },
  (t) => [uniqueIndex("staff_email").on(t.email)],
);

export const otpCodes = sqliteTable("otp_codes", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  detail: text("detail").notNull(),
  at: text("at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
