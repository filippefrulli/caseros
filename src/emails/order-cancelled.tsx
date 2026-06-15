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
  buyerName: string | null;
  orderId: string;
  appUrl: string;
};

export function OrderCancelledEmail({ buyerName, orderId, appUrl }: Props) {
  const shortId = orderId.slice(-8).toUpperCase();
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>Your order #{shortId} has been cancelled and refunded</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>caseros</Heading>
          <Heading style={h2}>Your order has been cancelled</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            We&apos;re sorry, but the seller was unable to fulfil your order <strong>#{shortId}</strong>{" "}
            and has cancelled it.
          </Text>

          <Section style={refundBox}>
            <Text style={{ ...text, margin: "0", fontWeight: "600" }}>
              You&apos;ve been refunded in full.
            </Text>
            <Text style={{ ...text, margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              The full amount, including shipping, has been returned to your original payment method.
              It usually appears within a few business days.
            </Text>
          </Section>

          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={`${appUrl}/account/orders`} style={secondaryLink}>
              View order details
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

const refundBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "24px",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0 12px",
};

const secondaryLink: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  textDecoration: "underline",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center",
  margin: "0",
};
