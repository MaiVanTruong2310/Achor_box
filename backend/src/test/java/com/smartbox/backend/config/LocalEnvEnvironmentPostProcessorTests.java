package com.smartbox.backend.config;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class LocalEnvEnvironmentPostProcessorTests {
    @org.springframework.context.annotation.Configuration(proxyBeanMethods=false)
    static class EmptyApplication {}
    @TempDir Path directory;
    void prepare(Path root) throws Exception{Files.createDirectories(root.resolve("src/main/java/com/smartbox/backend"));Files.writeString(root.resolve(".env"),"\uFEFF# local test\nSUPABASE_URL='https://project.test'\nSUPABASE_ANON_KEY=\"public-test-key\"\nINVOICE_SHOP_ADDRESS=Địa chỉ thử nghiệm\nVALUE=a=b#c\n");}
    @Test void backendAndRootLaunchLoadUtf8QuotesAndKeepExplicitOverrides() throws Exception {
        prepare(directory.resolve("backend"));
        var root=new MockEnvironment().withProperty("SUPABASE_ANON_KEY","external-key");
        new LocalEnvEnvironmentPostProcessor(directory).postProcessEnvironment(root,null);
        assertEquals("https://project.test",root.getProperty("SUPABASE_URL"));assertEquals("external-key",root.getProperty("SUPABASE_ANON_KEY"));assertEquals("Địa chỉ thử nghiệm",root.getProperty("INVOICE_SHOP_ADDRESS"));assertEquals("a=b#c",root.getProperty("VALUE"));
        var backend=new MockEnvironment();new LocalEnvEnvironmentPostProcessor(directory.resolve("backend")).postProcessEnvironment(backend,null);assertEquals("public-test-key",backend.getProperty("SUPABASE_ANON_KEY"));
    }
    @Test void missingDisabledAndUnrelatedFilesAreNotLoaded() throws Exception {
        Files.writeString(directory.resolve(".env"),"SUPABASE_ANON_KEY=unrelated");var env=new MockEnvironment();
        new LocalEnvEnvironmentPostProcessor(directory).postProcessEnvironment(env,null);assertNull(env.getProperty("SUPABASE_ANON_KEY"));
        prepare(directory);var disabled=new MockEnvironment().withProperty("smartbox.env-file.enabled","false");new LocalEnvEnvironmentPostProcessor(directory).postProcessEnvironment(disabled,null);assertNull(disabled.getProperty("SUPABASE_URL"));
    }
    @Test void malformedEntryNeverEchoesSecretContents() throws Exception {
        prepare(directory);Files.writeString(directory.resolve(".env"),"invalid-secret-value");
        var ex=assertThrows(IllegalStateException.class,()->new LocalEnvEnvironmentPostProcessor(directory).postProcessEnvironment(new MockEnvironment(),null));assertFalse(ex.getMessage().contains("invalid-secret-value"));
    }
    @Test void springBootDiscoversProcessorAndResolvesAuthPlaceholders() throws Exception {
        prepare(directory);
        var application=new org.springframework.boot.SpringApplication(EmptyApplication.class);
        application.setWebApplicationType(org.springframework.boot.WebApplicationType.NONE);
        application.setBannerMode(org.springframework.boot.Banner.Mode.OFF);application.setLogStartupInfo(false);
        try(var context=application.run("--smartbox.env-file.enabled=true","--smartbox.env-file="+directory.resolve(".env"))){
            assertEquals("https://project.test",context.getEnvironment().getProperty("smartbox.supabase.url"));
            assertEquals("public-test-key",context.getEnvironment().getProperty("smartbox.supabase.anon-key"));
        }
    }
}
