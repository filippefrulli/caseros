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
  sellerType: string;
  appUrl: string;
};

export function AdminSellerApplicationEmail({ shopName, sellerType, appUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>New seller application from {shopName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>caseros</Heading>
          <Heading style={h2}>New seller application</Heading>
          <Text style={text}>
            <strong>{shopName}</strong> ({sellerType.toLowerCase()}) has submitted a seller application and is waiting for your review.
          </Text>
          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Link href={`${appUrl}/admin/sellers`} style={button}>
              Review application
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
