import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";

type Item = { title: string; quantity: number; unitAmount: number; currency: string };

type Props = {
  buyerName: string | null;
  orderId: string;
  items: Item[];
  totalAmount: number;
  currency: string;
  appUrl: string;
};

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

export function OrderDeliveredEmail({ buyerName, orderId, items, totalAmount, currency, appUrl }: Props) {
  const shortId = orderId.slice(-8).toUpperCase();
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>Your order #{shortId} has been delivered</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>caseros</Heading>
          <Heading style={h2}>Your order has been delivered</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Order <strong>#{shortId}</strong> has been marked as delivered. We hope you love what you received!
          </Text>

          <Section style={itemsSection}>
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={itemName}>
                  {item.title} × {item.quantity}
                </Column>
                <Column style={itemPrice}>
                  {fmt(item.unitAmount * item.quantity, item.currency)}
                </Column>
              </Row>
            ))}
            <Hr style={hr} />
            <Row style={itemRow}>
              <Column style={{ ...itemName, fontWeight: "600" }}>Total</Column>
              <Column style={{ ...itemPrice, fontWeight: "600" }}>{fmt(totalAmount, currency)}</Column>
            </Row>
          </Section>

          <Text style={{ ...text, marginTop: "20px" }}>
            If anything is wrong with your order, please get in touch and we&apos;ll make it right.
          </Text>

          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={`${appUrl}/account/orders`} style={button}>
              View your orders
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

const itemsSection: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "24px",
};

const itemRow: React.CSSProperties = {
  padding: "6px 0",
};

const itemName: React.CSSProperties = {
  fontSize: "14px",
  color: "#374151",
};

const itemPrice: React.CSSProperties = {
  fontSize: "14px",
  color: "#111827",
  textAlign: "right",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "12px 0",
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
