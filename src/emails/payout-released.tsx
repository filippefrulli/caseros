import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  shopName: string;
  orderId: string;
  payoutAmount: number;
  currency: string;
  appUrl: string;
};

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

export function PayoutReleasedEmail({ shopName, orderId, payoutAmount, currency, appUrl }: Props) {
  const shortId = orderId.slice(-8).toUpperCase();

  return (
    <Html>
      <Head />
      <Preview>Your payout for order #{shortId} is on its way</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>caseros</Heading>
          <Heading style={h2}>Your payout is on its way</Heading>
          <Text style={text}>
            Great news! The payout for order <strong>#{shortId}</strong> in <strong>{shopName}</strong> has been released.
          </Text>

          <Section style={highlight}>
            <Text style={amount}>{fmt(payoutAmount, currency)}</Text>
            <Text style={amountLabel}>sent to your Stripe account</Text>
          </Section>

          <Text style={text}>
            Funds typically arrive within 1–2 business days depending on your Stripe payout schedule.
            You can check your balance any time in your Stripe Express dashboard.
          </Text>

          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={`${appUrl}/seller/dashboard`} style={button}>
              Go to dashboard
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>Caseros: original goods from EU makers.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "40px",
  borderRadius: "12px",
  maxWidth: "520px",
};

const h1: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 24px",
  letterSpacing: "-0.3px",
};

const h2: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 16px",
  letterSpacing: "-0.3px",
};

const text: React.CSSProperties = {
  fontSize: "15px",
  color: "#374151",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const highlight: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center",
  margin: "24px 0",
};

const amount: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#15803d",
  margin: "0",
};

const amountLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#16a34a",
  margin: "4px 0 0",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0 12px",
};

const button: React.CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center",
  margin: "0",
};
