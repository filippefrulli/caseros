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
  trackingCode: string;
  trackingUrl: string;
  appUrl: string;
};

export function OrderShippedEmail({ buyerName, orderId, trackingCode, trackingUrl, appUrl }: Props) {
  const shortId = orderId.slice(-8).toUpperCase();
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>Your order #{shortId} is on its way</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>caseros</Heading>
          <Heading style={h2}>Your order is on its way</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Great news — your order <strong>#{shortId}</strong> has been shipped.
          </Text>

          <Section style={trackingBox}>
            <Text style={{ ...text, margin: "0 0 4px", fontSize: "13px", color: "#6b7280" }}>Tracking number</Text>
            <Text style={{ ...text, margin: "0", fontWeight: "600", fontFamily: "monospace", fontSize: "16px" }}>{trackingCode}</Text>
          </Section>

          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={trackingUrl} style={button}>
              Track your parcel
            </Link>
          </Section>

          <Section style={{ textAlign: "center", marginTop: "16px" }}>
            <Link href={`${appUrl}/account/orders`} style={secondaryLink}>
              View order details
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>caseros — handmade goods from EU makers.</Text>
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

const trackingBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "24px",
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
