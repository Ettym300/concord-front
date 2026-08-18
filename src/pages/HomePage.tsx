import style from "./HomePage.module.css";
import env from "@/common/env";
import Button from "@/components/ui/Button";
import PageHeader from "../components/PageHeader";
import Text from "@/components/ui/Text";
import Icon from "@/components/ui/icon/Icon";
import PageFooter from "@/components/PageFooter";
import { useTransContext } from "@nerimity/solid-i18lite";

const CONCORD_GITHUB = "https://github.com/Ettym200/concord-front";

export default function HomePage() {
  const [t] = useTransContext();
  const isRelease = env.APP_VERSION?.startsWith("v");

  const releaseLink = isRelease
    ? `${CONCORD_GITHUB}/releases/${
        env.APP_VERSION ? `tag/${env.APP_VERSION}` : ""
      }`
    : `${CONCORD_GITHUB}/commits/main`;

  return (
    <div class={style.homePageContainer}>
      <PageHeader />
      <div class={style.content}>
        <div class={style.topContainer}>
          <a
            class={style.versionAnchor}
            href={releaseLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {env.APP_VERSION || "Unknown Version"}
          </a>

          <Text class={style.slogan} size={36} bold>
            {t("homePage.slogan")}
          </Text>
          <Text size={18} opacity={0.7} class={style.subslogan}>
            {t("homePage.subslogan")}
          </Text>
          <div class={style.buttonsContainer}>
            <Button
              href="/register"
              class={style.getStartedButton}
              iconName="open_in_browser"
              label={t("homePage.getStarted")!}
              color={"white"}
            />
            <Button
              href={CONCORD_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              color="white"
              iconName="code"
              label={t("homePage.viewGitHubButton")!}
            />
          </div>
        </div>
        <FeatureList />
      </div>
      <PageFooter />
    </div>
  );
}

function FeatureList() {
  const [t] = useTransContext();
  return (
    <div class={style.featureListContainer}>
      <Feature icon="gif" label={t("homePage.featureList.feature1")} />
      <Feature icon="preview" label={t("homePage.featureList.feature2")} />
      <Feature icon="sell" label={t("homePage.featureList.feature3")} />
      <Feature icon="add" label={t("homePage.featureList.feature4")} />
      <Feature icon="dns" label={t("homePage.featureList.feature5")} />
      <Feature icon="explore" label={t("homePage.featureList.feature6")} />
      <Feature icon="headphones" label={t("homePage.featureList.feature7")} />
      <Feature icon="code" label={t("homePage.featureList.feature8")} />
      <Feature
        icon="account_circle"
        label={t("homePage.featureList.feature9")}
      />
    </div>
  );
}

function Feature(props: { icon: string; label: string }) {
  return (
    <div class={style.featureContainer}>
      <Icon class={style.icon} name={props.icon} size={26} />
      <Text size={14} opacity={0.7}>
        {props.label}
      </Text>
    </div>
  );
}
