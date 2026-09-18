import { Product } from '../types/product';

/**
 * Danh mục sản phẩm Hộp nhận hàng thông minh Anchor Box chính hãng.
 * Đa dạng các dòng: Bản Tiêu chuẩn (Không Camera), Bản Rút gọn (Treo tường),
 * Bản Plus (Tích hợp Camera AI 1080p + Pin 12h), Bản Pro Max (Hộp kép + Dual Camera).
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'smart-box-std',
    sku: 'SBOX-STD-01',
    name: 'Anchor Box Standard (Không Camera)',
    subtitle: 'Hộp nhận hàng thông minh tự động khóa, phát hiện bưu phẩm, mở khóa từ xa (Phù hợp khu vực đã có camera).',
    description: `Anchor Box Standard là phiên bản tiêu chuẩn tin cậy, tối ưu chi phí phục vụ nhu cầu nhận bưu phẩm tự động tại nhà riêng, căn hộ hoặc văn phòng đã có sẵn camera an ninh khu vực cửa/cổng.

Thiết bị kết nối Wi-Fi 2.4GHz, tích hợp hệ thống cảm biến nhận diện bưu phẩm siêu âm, cảm biến kiểm tra trạng thái nắp hộp, cảm biến đo khối lượng kiện hàng (tải trọng 5kg) và cơ cấu chốt khóa điện tử tự động an toàn trong 2 giây sau khi hạ nắp. Ngoài ra, hộp trang bị bàn phím mã PIN 4x4 chống nước cho phép mở khóa nhanh trực tiếp tại chỗ.`,
    price: 899000,
    originalPrice: 990000,
    inStock: true,
    stockQuantity: 15,
    images: [
      '/products/smartbox-std-front.svg',
      '/products/smartbox-std-inside.svg',
      '/products/smartbox-std-diagram.svg'
    ],
    category: 'box',
    tags: ['Không Camera', 'Tự động khóa', 'Đo khối lượng 5kg', 'Mã PIN', 'Kết nối Wi-Fi'],
    dimensions: {
      width: 42,
      height: 52,
      depth: 38,
      weight: 4.8,
      maxLoadWeight: 5.0
    },
    features: [
      {
        title: 'Tự động khóa an toàn khi đóng nắp',
        description: 'Sau khi shipper đặt bưu phẩm vào và hạ nắp, cảm biến siêu âm xác nhận có hàng và kích hoạt chốt khóa điện tử trong 2 giây.'
      },
      {
        title: 'Cảm biến đo khối lượng bưu phẩm',
        description: 'Đo lường chính xác trọng lượng kiện hàng đặt vào (tối đa 5kg) để đối soát với thông tin đơn hàng trên ứng dụng.'
      },
      {
        title: 'Mở khóa từ xa qua Internet',
        description: 'Chủ nhà có thể gửi lệnh mở khóa ngay lập tức qua mạng Wi-Fi mọi lúc, mọi nơi cho người thân hoặc shipper.'
      },
      {
        title: 'Bàn phím mã PIN 4x4 dự phòng',
        description: 'Mở hộp tại chỗ bằng mã PIN cài đặt trước mà không phụ thuộc vào điện thoại hay kết nối mạng.'
      },
      {
        title: 'Chuông & Đèn báo trạng thái',
        description: 'Báo hiệu trạng thái sẵn sàng nhận hàng, xác nhận đóng khóa thành công và phát cảnh báo khi nắp chưa được đóng chặt.'
      }
    ],
    specs: [
      { name: 'Camera an ninh', value: 'Không tích hợp (Hỗ trợ gắn thêm Module Camera nâng cấp)', category: 'Hình ảnh & Camera' },
      { name: 'Kết nối mạng', value: 'Wi-Fi 2.4GHz tốc độ cao', category: 'Kết nối' },
      { name: 'Cơ cấu chốt khóa', value: 'Khóa điều khiển điện tử bánh răng kim loại chịu lực', category: 'Cơ khí & Khóa' },
      { name: 'Phát hiện bưu phẩm', value: 'Cảm biến khoảng cách siêu âm chống bụi', category: 'Cảm biến' },
      { name: 'Đo khối lượng hàng', value: 'Cảm biến tải trọng Load Cell (chính xác &plusmn;10g)', category: 'Cảm biến' },
      { name: 'Trạng thái nắp hộp', value: 'Cảm biến tiếp xúc từ tính MC-38', category: 'Cảm biến' },
      { name: 'Mở khóa tại chỗ', value: 'Bàn phím ma trận mã PIN 16 phím', category: 'Giao tiếp' },
      { name: 'Chỉ thị trạng thái', value: 'Đèn LED tín hiệu & Còi âm thanh Buzzer', category: 'Giao tiếp' },
      { name: 'Nguồn điện cấp', value: 'Adapter DC 5V / 2A (chuẩn Type-C)', category: 'Nguồn điện' },
      { name: 'Vật liệu khung vỏ', value: 'Thép mạ kẽm sơn tĩnh điện ngoài trời chống rỉ sét', category: 'Kích thước' },
      { name: 'Kích thước lòng hộp (D x R x C)', value: '38 x 34 x 46 cm (chứa vừa đa số hộp carton thương mại)', category: 'Kích thước' },
      { name: 'Tải trọng tối đa', value: '5.0 kg', category: 'Kích thước' }
    ],
    boxIncludes: [
      '01 Thùng Hộp Nhận Hàng Thông Minh Anchor Box Standard',
      '01 Bộ nguồn Adapter 5V/2A chuẩn Type-C dây 2m',
      '01 Bộ ốc vít & phụ kiện cố định chân đế/tường',
      '01 Thẻ hướng dẫn cài đặt & mã PIN mặc định',
      '01 Sách hướng dẫn sử dụng và phiếu bảo hành chính hãng'
    ],
    warrantyMonths: 12
  },
  {
    id: 'smart-box-compact',
    sku: 'SBOX-CMP-03',
    name: 'Anchor Box Compact (Treo Tường / Không Camera)',
    subtitle: 'Bản rút gọn siêu mỏng gắn tường cho căn hộ chung cư, nhận tài liệu và gói hàng nhỏ.',
    description: `Anchor Box Compact là giải pháp siêu gọn nhẹ thiết kế chuyên dụng cho hành lang căn hộ chung cư, cửa ra vào nhà riêng hoặc văn phòng có không gian hẹp.

Thiết kế treo tường vững chắc, phù hợp nhận các bưu phẩm thương mại điện tử cỡ vừa và nhỏ, mỹ phẩm, tài liệu, quần áo dưới 3kg. Vẫn giữ đầy đủ tính năng thông minh: tự động khóa khi đóng nắp, bàn phím mã PIN, kết nối Wi-Fi mở từ xa.`,
    price: 649000,
    originalPrice: 750000,
    inStock: true,
    stockQuantity: 20,
    images: [
      '/products/smartbox-compact-front.svg',
      '/products/smartbox-std-inside.svg',
      '/products/smartbox-std-diagram.svg'
    ],
    category: 'box',
    tags: ['Không Camera', 'Treo tường / Cửa', 'Gọn nhẹ 3kg', 'Mã PIN', 'Wi-Fi'],
    dimensions: {
      width: 32,
      height: 44,
      depth: 22,
      weight: 3.2,
      maxLoadWeight: 3.0
    },
    features: [
      {
        title: 'Thiết kế gắn tường siêu tiết kiệm diện tích',
        description: 'Độ sâu chỉ 22cm, không chiếm lối đi hành lang chung cư, gá cố định chắc chắn vào tường gạch hoặc khung gỗ.'
      },
      {
        title: 'Tự động chốt khóa khi đóng nắp',
        description: 'Cơ chế đóng tự khóa bảo vệ bưu phẩm an toàn cho tới khi chủ nhà về mở khóa.'
      },
      {
        title: 'Mở khóa qua ứng dụng & Bàn phím PIN',
        description: 'Linh hoạt mở hộp từ xa qua điện thoại hoặc bấm mã PIN trực tiếp trên thân hộp.'
      },
      {
        title: 'Vật liệu thép dập sơn tĩnh điện',
        description: 'Độ bền cao, chống trầy xước và thẩm mỹ thanh lịch, hài hòa với cửa ra vào hiện đại.'
      }
    ],
    specs: [
      { name: 'Camera an ninh', value: 'Không tích hợp (Thiết kế tối ưu kích thước siêu mỏng)', category: 'Hình ảnh & Camera' },
      { name: 'Kết nối mạng', value: 'Wi-Fi 2.4GHz', category: 'Kết nối' },
      { name: 'Cơ cấu chốt khóa', value: 'Khóa điều khiển điện tử siêu bền', category: 'Cơ khí & Khóa' },
      { name: 'Phát hiện bưu phẩm', value: 'Cảm biến quang học hồng ngoại', category: 'Cảm biến' },
      { name: 'Mở khóa tại chỗ', value: 'Bàn phím ma trận 12 phím', category: 'Giao tiếp' },
      { name: 'Nguồn điện cấp', value: 'Adapter DC 5V / 1.5A Type-C', category: 'Nguồn điện' },
      { name: 'Kích thước lòng hộp (D x R x C)', value: '29 x 19 x 38 cm', category: 'Kích thước' },
      { name: 'Tải trọng tối đa', value: '3.0 kg', category: 'Kích thước' }
    ],
    boxIncludes: [
      '01 Thùng Hộp Nhận Hàng Anchor Box Compact',
      '01 Bộ gá treo tường chuyên dụng & tắc kê sắt',
      '01 Nguồn Adapter 5V/1.5A Type-C',
      '01 Sách hướng dẫn & thẻ bảo hành 12 tháng'
    ],
    warrantyMonths: 12
  },
  {
    id: 'smart-box-plus',
    sku: 'SBOX-PLS-02',
    name: 'Anchor Box Plus (Có Camera AI 1080p & Pin 12h)',
    subtitle: 'Tích hợp Camera an ninh AI 1080p góc rộng, pin dự phòng mất điện 12 giờ, tải trọng 10kg.',
    description: `Phiên bản Anchor Box Plus là dòng sản phẩm cao cấp toàn diện nhất, được trang bị Camera an ninh AI 1080p góc rộng 135° tích hợp trực tiếp trên mặt trước của hộp.

Khi shipper tiếp cận hoặc mở nắp hộp, hệ thống tự động chụp ảnh bằng chứng giao hàng có gắn mốc thời gian và gửi thông báo kèm hình ảnh về điện thoại của bạn ngay lập tức. Ngoài ra, hộp tích hợp sẵn pin sạc Lithium-ion dự phòng duy trì hoạt động 12 giờ khi mất điện, cảm biến theo dõi nhiệt độ - độ ẩm buồng chứa và mâm chịu lực 10kg cho các kiện hàng lớn.`,
    price: 1399000,
    originalPrice: 1590000,
    inStock: true,
    stockQuantity: 12,
    images: [
      '/products/smartbox-plus-front.svg',
      '/products/smartbox-std-inside.svg',
      '/products/smartbox-std-diagram.svg'
    ],
    category: 'box',
    tags: ['Camera AI 1080p', 'Pin dự phòng 12h', 'Tải trọng 10kg', 'Cảm biến nhiệt ẩm', 'Tự động khóa'],
    dimensions: {
      width: 48,
      height: 60,
      depth: 42,
      weight: 6.5,
      maxLoadWeight: 10.0
    },
    features: [
      {
        title: 'Camera AI 1080p góc rộng 135°',
        description: 'Tự động nhận diện người giao hàng, ghi lại hình ảnh kiện hàng lúc đặt vào hộp để lưu trữ bằng chứng đối soát khi có khiếu nại.'
      },
      {
        title: 'Pin dự phòng duy trì 12 giờ khi mất điện',
        description: 'Hệ thống tự động chuyển nguồn pin Lithium-ion dự phòng liền mạch khi cúp điện, đảm bảo không gián đoạn nhận hàng.'
      },
      {
        title: 'Tải trọng chứa hàng gia cường 10kg',
        description: 'Dung tích rộng rãi chứa được đồng thời nhiều kiện hàng lớn, đồ gia dụng, bình nước hoặc thực phẩm khô.'
      },
      {
        title: 'Theo dõi nhiệt độ & độ ẩm buồng chứa',
        description: 'Cảm biến môi trường cập nhật thông số nhiệt độ bên trong hộp, an toàn cho mỹ phẩm và thực phẩm.'
      },
      {
        title: 'Cơ cấu chốt khóa đôi an toàn',
        description: 'Tăng cường lực giữ nắp hộp, chống cạy phá hiệu quả vượt trội.'
      }
    ],
    specs: [
      { name: 'Camera an ninh', value: 'Camera AI góc rộng 135°, độ phân giải Full HD 1080p, có hồng ngoại nhìn đêm', category: 'Hình ảnh & Camera' },
      { name: 'Chế độ chụp ảnh', value: 'Tự động chụp khi nắp mở / phát hiện chuyển động & gửi thông báo về máy', category: 'Hình ảnh & Camera' },
      { name: 'Pin dự phòng UPS', value: 'Pin Lithium-ion 2600mAh tích hợp mạch sạc thông minh (duy trì 12 giờ)', category: 'Nguồn điện' },
      { name: 'Kết nối mạng', value: 'Wi-Fi 2.4GHz + Bluetooth BLE', category: 'Kết nối' },
      { name: 'Cơ cấu chốt khóa', value: 'Khóa đôi điều khiển điện tử gia cường', category: 'Cơ khí & Khóa' },
      { name: 'Phát hiện bưu phẩm', value: 'Cảm biến khoảng cách siêu âm kép', category: 'Cảm biến' },
      { name: 'Cảm biến môi trường', value: 'Cảm biến nhiệt độ & độ ẩm kỹ thuật số', category: 'Cảm biến' },
      { name: 'Đo khối lượng hàng', value: 'Cảm biến tải trọng Load Cell 10kg (chính xác &plusmn;20g)', category: 'Cảm biến' },
      { name: 'Mở khóa tại chỗ', value: 'Bàn phím mã PIN 16 phím', category: 'Giao tiếp' },
      { name: 'Nguồn điện chính', value: 'Adapter DC 5V / 3A chuẩn Type-C', category: 'Nguồn điện' },
      { name: 'Kích thước lòng hộp (D x R x C)', value: '44 x 38 x 54 cm', category: 'Kích thước' },
      { name: 'Tải trọng tối đa', value: '10.0 kg', category: 'Kích thước' }
    ],
    boxIncludes: [
      '01 Thùng Hộp Nhận Hàng Thông Minh Anchor Box Plus (Tích hợp Camera 1080p)',
      '01 Module Pin sạc dự phòng 12h tích hợp sẵn',
      '01 Bộ nguồn Adapter 5V/3A chuẩn Type-C',
      '01 Bộ chân đế cao su chống ẩm & phụ kiện gắn cố định',
      '01 Thẻ bảo hành chính hãng 18 tháng và sách hướng dẫn'
    ],
    warrantyMonths: 18
  },
  {
    id: 'smart-box-promax',
    sku: 'SBOX-PRO-04',
    name: 'Anchor Box Pro Max (Hộp Kép 2 Tầng & Dual-Cam 2K)',
    subtitle: 'Đẳng cấp biệt thự & nhà phố: Dual Camera 2K trước + nội soi buồng chứa, 2 ngăn nhận hàng độc lập.',
    description: `Anchor Box Pro Max là phiên bản thương mại cao cấp nhất được thiết kế chuyên biệt cho biệt thự, nhà mặt phố và văn phòng đại diện có lượng giao nhận bưu phẩm lớn.

Sản phẩm sở hữu cấu trúc 2 tầng thông minh: Tầng trên có khe thả thư & kiện nhỏ tự lọt với cơ chế chống móc hàng 1 chiều 24/7; Tầng dưới là buồng chứa siêu lớn 18kg trang bị khóa điện tử tự động và đèn LED trợ sáng. Điểm đột phá là hệ thống Dual-Camera: 01 Camera 2K mặt trước nhận diện khuôn mặt shipper + 01 Camera nội soi góc siêu rộng bên trong lòng hộp để bạn kiểm tra trực tiếp tình trạng bên trong bưu phẩm qua ứng dụng.`,
    price: 1990000,
    originalPrice: 2300000,
    inStock: true,
    stockQuantity: 6,
    images: [
      '/products/smartbox-promax-front.svg',
      '/products/smartbox-std-inside.svg',
      '/products/smartbox-std-diagram.svg'
    ],
    category: 'box',
    tags: ['Dual-Cam 2K & Nội soi', 'Hộp kép 2 tầng', 'Pin dự phòng 24h', 'Tải trọng 18kg', 'LED buồng chứa'],
    dimensions: {
      width: 52,
      height: 75,
      depth: 46,
      weight: 9.8,
      maxLoadWeight: 18.0
    },
    features: [
      {
        title: 'Hệ thống Dual-Camera (Mặt trước 2K & Nội soi lòng hộp)',
        description: 'Camera ngoài nhận diện người giao hàng; Camera trong buồng chứa kiểm tra trực tiếp số lượng và tình trạng bưu phẩm.'
      },
      {
        title: 'Cấu trúc 2 tầng nhận hàng liên tục không giới hạn',
        description: 'Tầng trên nhận thư, hồ sơ và bưu phẩm nhỏ tự lọt; Tầng dưới nhận kiện hàng lớn với chốt khóa điện tử thông minh.'
      },
      {
        title: 'Pin sạc dự phòng công suất lớn 24 giờ',
        description: 'Dung lượng pin 5000mAh duy trì hoạt động đầy đủ cả 2 camera và hệ thống khóa liên tục cả ngày khi mất điện.'
      },
      {
        title: 'Đèn LED chiếu sáng tự động trong lòng hộp',
        description: 'Tự động bật sáng khi mở nắp hoặc khi camera nội soi chụp ảnh trong điều kiện trời tối.'
      },
      {
        title: 'Mái dốc che mưa & Thép dập chống va đập',
        description: 'Thiết kế mái dốc chống ứ đọng nước mưa, thích hợp lắp đặt hoàn toàn ngoài trời không cần mái che.'
      }
    ],
    specs: [
      { name: 'Hệ thống Camera', value: 'Dual-Cam: Camera trước 2K AI + Camera nội soi góc rộng 160° trong lòng hộp', category: 'Hình ảnh & Camera' },
      { name: 'Tính năng Camera', value: 'Đàm thoại 2 chiều, ghi video khi phát hiện chuyển động, hồng ngoại Night Vision', category: 'Hình ảnh & Camera' },
      { name: 'Cấu trúc ngăn chứa', value: '2 Ngăn độc lập (Ngăn thả bưu phẩm nhỏ 1 chiều + Ngăn lớn khóa tự động)', category: 'Kích thước' },
      { name: 'Pin dự phòng UPS', value: 'Pin Lithium-ion 5000mAh (hoạt động 24 giờ liên tục)', category: 'Nguồn điện' },
      { name: 'Chiếu sáng nội bộ', value: 'Dải đèn LED siêu sáng tự động kích hoạt khi mở', category: 'Giao tiếp' },
      { name: 'Kết nối mạng', value: 'Wi-Fi 2.4GHz / 5GHz + Bluetooth 5.0', category: 'Kết nối' },
      { name: 'Cơ cấu chốt khóa', value: 'Khóa điện tử đa điểm chống cạy phá chuẩn công nghiệp', category: 'Cơ khí & Khóa' },
      { name: 'Đo khối lượng hàng', value: 'Mâm cân điện tử 18kg (độ chính xác &plusmn;20g)', category: 'Cảm biến' },
      { name: 'Kích thước lòng hộp (D x R x C)', value: '48 x 42 x 68 cm', category: 'Kích thước' },
      { name: 'Tải trọng tối đa', value: '18.0 kg', category: 'Kích thước' }
    ],
    boxIncludes: [
      '01 Thùng Hộp Nhận Hàng Anchor Box Pro Max (Dual-Cam 2 Tầng)',
      '01 Bộ nguồn Adapter chống nước chuẩn ngoài trời Type-C 5V/3A',
      '01 Bộ pin sạc dự phòng 24h lắp sẵn',
      '01 Bộ giá đỡ chân đế chống trộm & bu-lông nở sắt',
      '01 Thẻ bảo hành VIP 24 tháng chính hãng'
    ],
    warrantyMonths: 24
  },
  {
    id: 'smart-box-keypad-module',
    sku: 'SBOX-ACC-01',
    name: 'Bàn Phím Mã PIN Chống Nước (Phụ Kiện)',
    subtitle: 'Module bàn phím 16 phím bấm dự phòng cho thiết bị Hộp nhận hàng Anchor Box.',
    description: `Module bàn phím ma trận 16 phím bấm kèm cáp kết nối chuyên dụng để lắp đặt thay thế hoặc trang bị bổ sung cho thiết bị Anchor Box.`,
    price: 149000,
    originalPrice: 180000,
    inStock: true,
    stockQuantity: 40,
    images: [
      '/products/accessory-keypad.svg'
    ],
    category: 'accessory',
    tags: ['Phụ kiện chính hãng', 'Bàn phím PIN', 'Linh kiện'],
    dimensions: {
      width: 7.7,
      height: 7.0,
      depth: 0.8,
      weight: 0.05,
      maxLoadWeight: 0
    },
    features: [
      {
        title: 'Phím bấm tiếp xúc êm, độ bền cao',
        description: 'Độ nảy tốt, phủ màng bảo vệ chống bụi và giọt bắn nước mưa.'
      },
      {
        title: 'Lắp đặt thay thế dễ dàng',
        description: 'Chuẩn cắm tương thích trực tiếp với đầu kết nối trên thiết bị Anchor Box.'
      }
    ],
    specs: [
      { name: 'Quy cách bàn phím', value: '16 phím màng bảo vệ', category: 'Phần cứng' },
      { name: 'Điện áp hoạt động', value: 'DC 3.3V - 5V', category: 'Phần cứng' },
      { name: 'Chiều dài cáp', value: '20 cm', category: 'Kết nối' }
    ],
    boxIncludes: [
      '01 Bàn phím mã PIN 16 phím',
      '01 Cáp kết nối tín hiệu',
      '01 Miếng keo đệm dán chuyên dụng'
    ],
    warrantyMonths: 6
  },
  {
    id: 'smart-box-camera-module',
    sku: 'SBOX-ACC-02',
    name: 'Module Camera AI 1080p Gắn Ngoài (Phụ Kiện)',
    subtitle: 'Module camera an ninh góc rộng 135° nâng cấp cho Anchor Box Standard và Compact.',
    description: `Module Camera AI Full HD 1080p chuyên dụng dùng để nâng cấp bổ sung tính năng ghi hình và chụp ảnh bằng chứng giao hàng cho các dòng Anchor Box Standard hoặc Anchor Box Compact.

Cổng cắm mở rộng chuẩn Type-C kết nối trực tiếp vào bo mạch điều khiển của hộp, tự động nhận diện phần cứng trong 30 giây mà không cần cấu hình phức tạp. Có đèn LED hồng ngoại hỗ trợ quan sát ban đêm rõ nét.`,
    price: 320000,
    originalPrice: 390000,
    inStock: true,
    stockQuantity: 25,
    images: [
      '/products/accessory-camera.svg'
    ],
    category: 'accessory',
    tags: ['Phụ kiện chính hãng', 'Camera AI 1080p', 'Nâng cấp hình ảnh'],
    dimensions: {
      width: 5.5,
      height: 5.5,
      depth: 3.0,
      weight: 0.08,
      maxLoadWeight: 0
    },
    features: [
      {
        title: 'Độ phân giải Full HD 1080p sắc nét',
        description: 'Góc nhìn rộng 135° bao quát toàn bộ khu vực trước cửa và thao tác đặt hàng của shipper.'
      },
      {
        title: 'Cắm là chạy (Plug & Play)',
        description: 'Cắm vào cổng chờ Type-C trên Anchor Box, bo mạch tự đồng bộ trong 30 giây.'
      },
      {
        title: 'Hồng ngoại ban đêm Night Vision',
        description: 'Tự động kích hoạt cảm biến hồng ngoại khi ánh sáng yếu, chụp rõ mặt cả vào ban đêm.'
      }
    ],
    specs: [
      { name: 'Độ phân giải cảm biến', value: 'Full HD 1080p (1920 x 1080)', category: 'Hình ảnh' },
      { name: 'Góc quan sát', value: '135° Wide Angle', category: 'Hình ảnh' },
      { name: 'Hồng ngoại nhìn đêm', value: '4 Đèn IR LED tự động', category: 'Hình ảnh' },
      { name: 'Giao tiếp kết nối', value: 'Chuẩn cắm Type-C chuyên dụng Anchor Box', category: 'Kết nối' }
    ],
    boxIncludes: [
      '01 Module Camera AI 1080p',
      '01 Vòng gá cố định chống nước',
      '01 Hướng dẫn lắp đặt nhanh'
    ],
    warrantyMonths: 12
  },
  {
    id: 'smart-box-mount-kit',
    sku: 'SBOX-ACC-03',
    name: 'Bộ Khung Gá & Chân Đế Kim Loại Chống Trộm (Phụ Kiện)',
    subtitle: 'Khung thép mạ kẽm gia cố chân đế hộp vào nền bê tông hoặc tường bao ngoài trời.',
    description: `Bộ khung gá và chân đế kim loại chịu lực cao, được dập từ thép tấm mạ kẽm dày 2mm sơn tĩnh điện ngoài trời.

Giúp cố định vững chắc thiết bị Anchor Box vào nền bê tông, gạch sân hoặc tường bao, chống dịch chuyển hoặc nhấc trộm thiết bị. Đi kèm trọn bộ 04 bu-lông nở sắt chịu tải 150kg.`,
    price: 160000,
    originalPrice: 200000,
    inStock: true,
    stockQuantity: 35,
    images: [
      '/products/accessory-mount.svg'
    ],
    category: 'accessory',
    tags: ['Phụ kiện chính hãng', 'Chân đế chống trộm', 'Gá kim loại'],
    dimensions: {
      width: 40,
      height: 12,
      depth: 36,
      weight: 1.8,
      maxLoadWeight: 150.0
    },
    features: [
      {
        title: 'Thép mạ kẽm dày 2mm siêu chịu lực',
        description: 'Chống rỉ sét, chịu được mưa nắng ngoài trời và va đập cơ học.'
      },
      {
        title: 'Khoá ốc chìm chống tháo trộm',
        description: 'Ốc siết nằm hoàn toàn bên trong lòng hộp sau khi bắt vào đế, kẻ gian không thể tháo từ bên ngoài.'
      }
    ],
    specs: [
      { name: 'Vật liệu', value: 'Thép cán nguội mạ kẽm dày 2.0mm', category: 'Cơ khí' },
      { name: 'Sơn bề mặt', value: 'Sơn tĩnh điện chống ăn mòn ngoài trời', category: 'Cơ khí' },
      { name: 'Tải trọng neo giữ', value: 'Lên tới 150 kg lực kéo', category: 'Cơ khí' }
    ],
    boxIncludes: [
      '01 Bộ khung đế kim loại chữ U gia cường',
      '04 Bu-lông nở sắt M8 x 80mm',
      '04 Vít bắt chìm liên kết thân hộp'
    ],
    warrantyMonths: 24
  }
];
