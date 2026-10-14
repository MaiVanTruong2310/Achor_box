package com.smartbox.backend.service;
import com.smartbox.backend.exception.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;
class CloudinaryClaimImageStorageTests {
    @Test void missingCredentialsReturnUnavailableWithoutFakeUpload(){
        var storage=new CloudinaryClaimImageStorage();
        org.springframework.test.util.ReflectionTestUtils.setField(storage,"cloud","");org.springframework.test.util.ReflectionTestUtils.setField(storage,"key","");org.springframework.test.util.ReflectionTestUtils.setField(storage,"secret","");
        var error=assertThrows(AppException.class,()->storage.upload(new MockMultipartFile("file","a.png","image/png",new byte[]{1})));
        assertEquals(503,error.getCode());assertEquals("CLOUDINARY_NOT_CONFIGURED",error.getMessage());
    }
    @Test void rejectsSpoofedSvgEmptyAndOversizeFiles(){
        for(byte[] bytes:new byte[][]{new byte[0],"<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes(),new byte[5*1024*1024+1]})
            assertThrows(BadRequestException.class,()->CloudinaryClaimImageStorage.validated(new MockMultipartFile("file","a.png","image/png",bytes)));
    }
    @Test void validatesAndReencodesActualJpegAndPng()throws Exception {
        for(String format:new String[]{"png","jpeg"}){
            var image=new java.awt.image.BufferedImage(3,3,java.awt.image.BufferedImage.TYPE_INT_RGB);var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,format,bytes);
            byte[] result=CloudinaryClaimImageStorage.validated(new MockMultipartFile("file","untrusted-name.exe","application/octet-stream",bytes.toByteArray()));
            assertEquals(3,javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(result)).getWidth());
        }
    }
}
