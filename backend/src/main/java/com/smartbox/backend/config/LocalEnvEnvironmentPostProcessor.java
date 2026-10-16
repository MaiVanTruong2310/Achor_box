package com.smartbox.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Local configuration only; OS/CLI properties retain precedence. Never logs file values. */
public class LocalEnvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    private final Path directory;
    public LocalEnvEnvironmentPostProcessor(){this(Path.of(""));}
    LocalEnvEnvironmentPostProcessor(Path directory){this.directory=directory.toAbsolutePath().normalize();}
    @Override public int getOrder(){return ConfigDataEnvironmentPostProcessor.ORDER-1;}
    @Override public void postProcessEnvironment(ConfigurableEnvironment env,SpringApplication application){
        if(!env.getProperty("smartbox.env-file.enabled",Boolean.class,true))return;
        String explicit=env.getProperty("smartbox.env-file");
        Path file;
        if(explicit!=null&&!explicit.isBlank())file=directory.resolve(explicit).normalize();
        else if(Files.isDirectory(directory.resolve("src/main/java/com/smartbox/backend")))file=directory.resolve(".env");
        else if(Files.isDirectory(directory.resolve("backend/src/main/java/com/smartbox/backend")))file=directory.resolve("backend/.env");
        else return;
        if(!Files.isRegularFile(file))return;
        Map<String,Object> values=new LinkedHashMap<>();
        try {
            var lines=Files.readAllLines(file,StandardCharsets.UTF_8);
            for(int i=0;i<lines.size();i++){
                String line=lines.get(i);if(i==0&&line.startsWith("\uFEFF"))line=line.substring(1);
                if(line.isBlank()||line.stripLeading().startsWith("#"))continue;
                int equals=line.indexOf('=');
                if(equals<0||!line.substring(0,equals).trim().matches("[A-Z][A-Z0-9_]*"))throw new IllegalStateException("Invalid local environment entry at line "+(i+1));
                String key=line.substring(0,equals).trim(),value=line.substring(equals+1).trim();
                if(value.length()>=2&&((value.startsWith("\"")&&value.endsWith("\""))||(value.startsWith("'")&&value.endsWith("'"))))value=value.substring(1,value.length()-1);
                values.put(key,value);
            }
        }catch(java.io.IOException ex){throw new IllegalStateException("Cannot read local environment file",ex);}
        env.getPropertySources().addLast(new MapPropertySource("smartboxLocalDotEnv",values));
    }
}
