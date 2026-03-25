import { getServerSession } from "next-auth/next";
import type { GetServerSidePropsContext } from "next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export async function requireAuth(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  // Sanitize session: replace undefined values with null for JSON serialization
  const safeSession = JSON.parse(JSON.stringify(session, (_key, value) =>
    value === undefined ? null : value
  ));

  return { props: { session: safeSession } };
}
